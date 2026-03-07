package gitinterop

import (
	"bufio"
	"bytes"
	"net/http/httptest"
	"testing"
)

func TestWriteReceivePackLineSidebandCarriesPktLine(t *testing.T) {
	h := &SmartHTTPHandler{}
	rec := httptest.NewRecorder()

	h.writeReceivePackLine(rec, "unpack ok\n", true)

	outer := bufio.NewReader(bytes.NewReader(rec.Body.Bytes()))
	frame, err := readPktLine(outer)
	if err != nil {
		t.Fatalf("read sideband frame: %v", err)
	}
	if len(frame) < 2 {
		t.Fatalf("expected sideband frame payload, got %q", string(frame))
	}
	if frame[0] != 1 {
		t.Fatalf("expected sideband channel 1, got %d", frame[0])
	}

	inner := bufio.NewReader(bytes.NewReader(frame[1:]))
	line, err := readPktLine(inner)
	if err != nil {
		t.Fatalf("read inner pkt-line: %v", err)
	}
	if string(line) != "unpack ok\n" {
		t.Fatalf("expected inner pkt-line 'unpack ok\\n', got %q", string(line))
	}
}

func TestSendReceivePackResultSidebandIncludesInnerFlush(t *testing.T) {
	h := &SmartHTTPHandler{}
	rec := httptest.NewRecorder()

	h.sendReceivePackResult(rec, "", []refUpdate{{refName: "refs/heads/main"}}, map[string]string{}, true)

	outer := bufio.NewReader(bytes.NewReader(rec.Body.Bytes()))

	first, err := readPktLine(outer)
	if err != nil {
		t.Fatalf("read first sideband frame: %v", err)
	}
	assertInnerPktLine(t, first, "unpack ok\n")

	second, err := readPktLine(outer)
	if err != nil {
		t.Fatalf("read second sideband frame: %v", err)
	}
	assertInnerPktLine(t, second, "ok refs/heads/main\n")

	third, err := readPktLine(outer)
	if err != nil {
		t.Fatalf("read third sideband frame: %v", err)
	}
	if len(third) < 5 || third[0] != 1 || string(third[1:]) != "0000" {
		t.Fatalf("expected sideband inner flush, got %q", string(third))
	}

	final, err := readPktLine(outer)
	if err != nil {
		t.Fatalf("read final outer flush: %v", err)
	}
	if final != nil {
		t.Fatalf("expected final outer flush packet, got %q", string(final))
	}
}

func assertInnerPktLine(t *testing.T, sidebandFrame []byte, want string) {
	t.Helper()
	if len(sidebandFrame) < 2 {
		t.Fatalf("expected sideband frame payload, got %q", string(sidebandFrame))
	}
	if sidebandFrame[0] != 1 {
		t.Fatalf("expected sideband channel 1, got %d", sidebandFrame[0])
	}
	inner := bufio.NewReader(bytes.NewReader(sidebandFrame[1:]))
	got, err := readPktLine(inner)
	if err != nil {
		t.Fatalf("read inner pkt-line: %v", err)
	}
	if string(got) != want {
		t.Fatalf("expected inner pkt-line %q, got %q", want, string(got))
	}
}
