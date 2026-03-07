package service

import (
	"bytes"
	"log"
	"path"
	"sync"
	"unicode/utf8"

	"github.com/odvcencio/gotreesitter"
	"github.com/odvcencio/gotreesitter/grammars"
	"github.com/odvcencio/graft/pkg/entity"
	"github.com/odvcencio/orchard/internal/entityutil"
)

const maxHighlightBytes = 1024 * 1024

// HighlightRange is a byte span with a capture name for syntax coloring.
type HighlightRange struct {
	StartByte uint32 `json:"start_byte"`
	EndByte   uint32 `json:"end_byte"`
	Capture   string `json:"capture"`
}

// HighlightResult holds server-side blob enrichment data.
type HighlightResult struct {
	Language   string           `json:"language,omitempty"`
	Highlights []HighlightRange `json:"highlights,omitempty"`
	Entities   []EntityInfo     `json:"entities,omitempty"`
}

// HighlightService detects language, highlights source, and extracts entities.
type HighlightService struct {
	highlighters sync.Map // map[string]*gotreesitter.Highlighter
}

func NewHighlightService() *HighlightService {
	return &HighlightService{}
}

func detectHighlightLanguage(filename string) string {
	name := path.Base(filename)
	if name == "" || name == "." || name == "/" {
		return ""
	}
	entry := grammars.DetectLanguage(name)
	if entry == nil {
		return ""
	}
	return entry.Name
}

// Highlight never returns an error. Unsupported or invalid input returns zero values.
func (s *HighlightService) Highlight(filename string, content []byte) (result HighlightResult) {
	if s == nil || len(content) == 0 || len(content) > maxHighlightBytes {
		return
	}
	if bytes.IndexByte(content, 0) >= 0 || !utf8.Valid(content) {
		return
	}

	name := path.Base(filename)
	if name == "" || name == "." || name == "/" {
		return
	}
	entry := grammars.DetectLanguage(name)
	if entry == nil {
		return
	}
	result.Language = entry.Name

	func() {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("highlight panic for %s (%s): %v", name, entry.Name, r)
				result.Highlights = nil
			}
		}()

		hl, err := s.getOrCreateHighlighter(entry)
		if err != nil {
			log.Printf("highlight init failed for %s (%s): %v", name, entry.Name, err)
			return
		}
		if hl == nil {
			return
		}

		ranges := hl.Highlight(content)
		result.Highlights = make([]HighlightRange, len(ranges))
		for i, r := range ranges {
			result.Highlights[i] = HighlightRange{
				StartByte: r.StartByte,
				EndByte:   r.EndByte,
				Capture:   r.Capture,
			}
		}
	}()

	func() {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("entity extraction panic for %s (%s): %v", name, entry.Name, r)
				result.Entities = nil
			}
		}()

		list, err := entity.Extract(name, content)
		if err != nil || list == nil || len(list.Entities) == 0 {
			return
		}

		result.Entities = make([]EntityInfo, len(list.Entities))
		for i, extracted := range list.Entities {
			result.Entities[i] = EntityInfo{
				Kind:      entityutil.KindName(extracted.Kind),
				Name:      extracted.Name,
				DeclKind:  extracted.DeclKind,
				Receiver:  extracted.Receiver,
				StartLine: extracted.StartLine,
				EndLine:   extracted.EndLine,
				Key:       extracted.IdentityKey(),
			}
		}
	}()

	return
}

func (s *HighlightService) getOrCreateHighlighter(entry *grammars.LangEntry) (*gotreesitter.Highlighter, error) {
	if entry == nil {
		return nil, nil
	}
	if cached, ok := s.highlighters.Load(entry.Name); ok {
		return cached.(*gotreesitter.Highlighter), nil
	}
	if entry.HighlightQuery == "" || entry.Language == nil {
		return nil, nil
	}

	lang := entry.Language()
	if lang == nil {
		return nil, nil
	}

	var opts []gotreesitter.HighlighterOption
	if entry.TokenSourceFactory != nil {
		opts = append(opts, gotreesitter.WithTokenSourceFactory(func(source []byte) gotreesitter.TokenSource {
			return entry.TokenSourceFactory(source, lang)
		}))
	}

	highlighter, err := gotreesitter.NewHighlighter(lang, entry.HighlightQuery, opts...)
	if err != nil {
		return nil, err
	}
	actual, _ := s.highlighters.LoadOrStore(entry.Name, highlighter)
	return actual.(*gotreesitter.Highlighter), nil
}
