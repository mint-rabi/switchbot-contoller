package main

import "testing"

func TestSwitchBotSign(t *testing.T) {
	got := switchBotSign("token", "secret", "1670000000000", "nonce")
	const want = "CWgC88FTwQeYnlUbZ3qXLHSUJgXPvxHlfmoD87lHX6Y="

	if got != want {
		t.Fatalf("switchBotSign() = %q, want %q", got, want)
	}
}
