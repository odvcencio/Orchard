package service

import "testing"

func TestHighlightGoSource(t *testing.T) {
	svc := NewHighlightService()
	result := svc.Highlight("main.go", []byte("package main\n\nfunc main() {}\n"))

	if result.Language != "go" {
		t.Fatalf("language = %q, want %q", result.Language, "go")
	}
	if len(result.Highlights) == 0 {
		t.Fatal("expected non-empty highlights for Go source")
	}

	foundKeyword := false
	for _, h := range result.Highlights {
		if h.Capture == "keyword" || h.Capture == "keyword.function" {
			foundKeyword = true
			break
		}
	}
	if !foundKeyword {
		t.Errorf("expected at least one keyword capture, got: %+v", result.Highlights)
	}
}

func TestHighlightPythonSource(t *testing.T) {
	svc := NewHighlightService()
	result := svc.Highlight("hello.py", []byte("def greet():\n    print('hi')\n"))

	if result.Language != "python" {
		t.Fatalf("language = %q, want %q", result.Language, "python")
	}
	if len(result.Highlights) == 0 {
		t.Fatal("expected non-empty highlights for Python source")
	}
}

func TestHighlightGoTestSource(t *testing.T) {
	svc := NewHighlightService()
	result := svc.Highlight("main_test.go", []byte("package main\n\nfunc TestMain(t *testing.T) {}\n"))

	if result.Language != "go" {
		t.Fatalf("language = %q, want %q", result.Language, "go")
	}
	if len(result.Highlights) == 0 {
		t.Fatal("expected non-empty highlights for Go test source")
	}
}

func TestHighlightUnknownLanguage(t *testing.T) {
	svc := NewHighlightService()
	result := svc.Highlight("data.xyz123", []byte("some random content"))

	if result.Language != "" {
		t.Fatalf("language = %q, want empty for unknown", result.Language)
	}
	if len(result.Highlights) != 0 {
		t.Fatal("expected no highlights for unknown language")
	}
}

func TestHighlightEmptySource(t *testing.T) {
	svc := NewHighlightService()
	result := svc.Highlight("main.go", nil)

	if len(result.Highlights) != 0 {
		t.Fatal("expected no highlights for empty source")
	}
}

func TestHighlightLargeFileSkipped(t *testing.T) {
	svc := NewHighlightService()
	large := make([]byte, maxHighlightBytes+1)
	for i := range large {
		large[i] = 'x'
	}
	result := svc.Highlight("big.go", large)

	if len(result.Highlights) != 0 {
		t.Fatal("expected no highlights for file over 1MB")
	}
}
