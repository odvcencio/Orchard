package service

import (
	"os"
	"path/filepath"
	"testing"
)

func TestHighlightCacheWriteAndRead(t *testing.T) {
	dir := t.TempDir()
	cache := NewHighlightCache(dir)

	result := HighlightResult{
		Language: "go",
		Highlights: []HighlightRange{
			{StartByte: 0, EndByte: 7, Capture: "keyword"},
		},
		Entities: []EntityInfo{
			{Kind: "declaration", Name: "main", DeclKind: "func", StartLine: 3, EndLine: 5, Key: "func:main"},
		},
	}

	cache.Put("abc123def456", result)

	got, ok := cache.Get("abc123def456")
	if !ok {
		t.Fatal("expected cache hit")
	}
	if got.Language != "go" {
		t.Fatalf("language = %q, want %q", got.Language, "go")
	}
	if len(got.Highlights) != 1 || got.Highlights[0].Capture != "keyword" {
		t.Fatalf("highlights mismatch: %+v", got.Highlights)
	}
	if len(got.Entities) != 1 || got.Entities[0].Name != "main" {
		t.Fatalf("entities mismatch: %+v", got.Entities)
	}
}

func TestHighlightCacheMiss(t *testing.T) {
	dir := t.TempDir()
	cache := NewHighlightCache(dir)

	_, ok := cache.Get("nonexistent")
	if ok {
		t.Fatal("expected cache miss")
	}
}

func TestHighlightCacheCorruptFile(t *testing.T) {
	dir := t.TempDir()
	cache := NewHighlightCache(dir)

	subdir := filepath.Join(dir, "ba")
	if err := os.MkdirAll(subdir, 0o755); err != nil {
		t.Fatal(err)
	}
	cachePath := filepath.Join(subdir, "bad123.json")
	if err := os.WriteFile(cachePath, []byte("{invalid json"), 0o644); err != nil {
		t.Fatal(err)
	}

	_, ok := cache.Get("bad123")
	if ok {
		t.Fatal("expected cache miss for corrupt file")
	}
	if _, err := os.Stat(cachePath); !os.IsNotExist(err) {
		t.Fatal("expected corrupt cache file to be deleted")
	}
}
