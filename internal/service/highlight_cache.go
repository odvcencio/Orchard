package service

import (
	"encoding/json"
	"log"
	"os"
	"path/filepath"
)

// HighlightCache stores immutable highlight results on disk keyed by blob SHA.
type HighlightCache struct {
	dir string
}

func NewHighlightCache(dir string) *HighlightCache {
	if dir == "" {
		return nil
	}
	return &HighlightCache{dir: dir}
}

func (c *HighlightCache) path(sha string) string {
	if len(sha) < 2 {
		return filepath.Join(c.dir, sha+".json")
	}
	return filepath.Join(c.dir, sha[:2], sha+".json")
}

func (c *HighlightCache) Get(sha string) (HighlightResult, bool) {
	if c == nil || sha == "" {
		return HighlightResult{}, false
	}

	p := c.path(sha)
	data, err := os.ReadFile(p)
	if err != nil {
		return HighlightResult{}, false
	}

	var result HighlightResult
	if err := json.Unmarshal(data, &result); err != nil {
		log.Printf("highlight cache: corrupt entry %s: %v", sha, err)
		_ = os.Remove(p)
		return HighlightResult{}, false
	}
	return result, true
}

func (c *HighlightCache) Put(sha string, result HighlightResult) {
	if c == nil || sha == "" {
		return
	}

	p := c.path(sha)
	if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
		log.Printf("highlight cache: mkdir failed for %s: %v", sha, err)
		return
	}

	data, err := json.Marshal(result)
	if err != nil {
		log.Printf("highlight cache: marshal failed for %s: %v", sha, err)
		return
	}

	tmp, err := os.CreateTemp(filepath.Dir(p), filepath.Base(p)+".*.tmp")
	if err != nil {
		log.Printf("highlight cache: temp file failed for %s: %v", sha, err)
		return
	}
	tmpName := tmp.Name()
	if _, err := tmp.Write(data); err != nil {
		log.Printf("highlight cache: write failed for %s: %v", sha, err)
		_ = tmp.Close()
		_ = os.Remove(tmpName)
		return
	}
	if err := tmp.Close(); err != nil {
		log.Printf("highlight cache: close failed for %s: %v", sha, err)
		_ = os.Remove(tmpName)
		return
	}
	if err := os.Rename(tmpName, p); err != nil {
		log.Printf("highlight cache: rename failed for %s: %v", sha, err)
		_ = os.Remove(tmpName)
	}
}
