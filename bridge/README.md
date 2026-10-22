# WhatsApp bridge (DEADLOCK patches)

Our changes on top of `lharries/whatsapp-mcp` (`whatsapp-bridge/`):
- updated whatsmeow for the current WhatsApp protocol (the pinned one gets "Client outdated (405)")
- REST API bound to 127.0.0.1 only (upstream listens on all interfaces with no auth)
- `deadlock.go`: `/api/status` (pairing QR), `/api/groups`, `/api/logout`, and sender display names
- the API starts before pairing so the `/new` page can show the QR

Setup on the stage laptop (needs Go: `brew install go`):

```bash
git clone https://github.com/lharries/whatsapp-mcp ~/whatsapp-mcp
cd ~/whatsapp-mcp/whatsapp-bridge
git apply ~/hackathon/bridge/main.go.patch
cp ~/hackathon/bridge/deadlock.go ~/hackathon/bridge/run-bridge.sh .
go get go.mau.fi/whatsmeow@latest && go mod tidy && go build -o whatsapp-bridge .
./run-bridge.sh
```
