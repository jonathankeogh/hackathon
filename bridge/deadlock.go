package main

// DEADLOCK additions: expose pairing state and groups so the /new page can
// show the link QR and a group picker. All on 127.0.0.1 (see startRESTServer).

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"sort"
	"strings"
	"sync"
	"time"

	"go.mau.fi/whatsmeow"
)

var pairing struct {
	sync.Mutex
	qr string
}

func setPairingQR(code string) {
	pairing.Lock()
	pairing.qr = code
	pairing.Unlock()
}

func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

func registerDeadlockHandlers(client *whatsmeow.Client) {
	// { status: "qr" | "connected" | "connecting", qr? }
	http.HandleFunc("/api/status", func(w http.ResponseWriter, r *http.Request) {
		if client.IsLoggedIn() {
			writeJSON(w, map[string]string{"status": "connected"})
			return
		}
		pairing.Lock()
		qr := pairing.qr
		pairing.Unlock()
		if qr != "" {
			writeJSON(w, map[string]string{"status": "qr", "qr": qr})
			return
		}
		writeJSON(w, map[string]string{"status": "connecting"})
	})

	// Groups the linked account is in, live from WhatsApp, most recent first.
	http.HandleFunc("/api/groups", func(w http.ResponseWriter, r *http.Request) {
		if !client.IsLoggedIn() {
			http.Error(w, "not linked", http.StatusConflict)
			return
		}
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()
		groups, err := client.GetJoinedGroups(ctx)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadGateway)
			return
		}
		type group struct {
			Jid  string `json:"jid"`
			Name string `json:"name"`
			Size int    `json:"size"`
		}
		out := make([]group, 0, len(groups))
		for _, g := range groups {
			out = append(out, group{Jid: g.JID.String(), Name: g.Name, Size: len(g.Participants)})
		}
		sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
		writeJSON(w, out)
	})

	// Fresh session for a new sign-up: unlink whoever is linked, delete the
	// stored session and synced chats, exit. run-bridge.sh restarts it with a
	// clean store and a new pairing QR.
	http.HandleFunc("/api/reset", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		if client.IsLoggedIn() {
			ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
			client.Logout(ctx) // best effort: the store is wiped either way
			cancel()
		}
		writeJSON(w, map[string]bool{"ok": true})
		go func() {
			time.Sleep(300 * time.Millisecond)
			client.Disconnect()
			os.RemoveAll("store")
			os.Exit(0)
		}()
	})

	// Unlink this device. The process exits; run it in a restart loop
	// (run-bridge.sh) and it comes back with a fresh QR.
	http.HandleFunc("/api/logout", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		if client.IsLoggedIn() {
			ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
			defer cancel()
			if err := client.Logout(ctx); err != nil {
				http.Error(w, err.Error(), http.StatusBadGateway)
				return
			}
		}
		writeJSON(w, map[string]bool{"ok": true})
		go func() {
			time.Sleep(300 * time.Millisecond)
			os.Exit(0)
		}()
	})
}

// Display names ("Priya") for senders, keyed by the bare user id (no
// @server suffix). The bridge stores LIDs for group senders, which carry no
// name, so the push name each message arrives with is the only source.
func (store *MessageStore) RememberName(sender, name string) {
	if sender == "" || name == "" {
		return
	}
	if i := strings.IndexByte(sender, '@'); i >= 0 {
		sender = sender[:i]
	}
	store.db.Exec(`CREATE TABLE IF NOT EXISTS sender_names (sender TEXT PRIMARY KEY, name TEXT)`)
	store.db.Exec(`INSERT INTO sender_names (sender, name) VALUES (?, ?)
		ON CONFLICT(sender) DO UPDATE SET name = excluded.name`, sender, name)
}
