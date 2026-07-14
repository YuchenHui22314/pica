# Magpie — Windows one-click launcher

Double-click → SSH tunnel to octal31 → Magpie opens in a dedicated Chrome window.

## One-time setup

1. **Get the files** (`magpie.ps1`, `magpie.bat`, `magpie.ico`) into one folder, e.g. `C:\magpie\`.

2. **Set up key auth for octal31** (arcade — a managed Kerberos gateway — rejects pubkey by
   POLICY, so its password must be typed once per tunnel; the octal31 hop goes password-free).
   In PowerShell:

   ```powershell
   ssh-keygen -t ed25519            # accept defaults; skip if you already have a key
   type $Env:USERPROFILE\.ssh\id_ed25519.pub | ssh huiyuche@arcade.iro.umontreal.ca "cat >> ~/.ssh/authorized_keys"
   type $Env:USERPROFILE\.ssh\id_ed25519.pub | ssh -J huiyuche@arcade.iro.umontreal.ca huiyuche@octal31.iro.umontreal.ca "cat >> ~/.ssh/authorized_keys"
   ```

   Verify it's password-free: `ssh -J huiyuche@arcade.iro.umontreal.ca huiyuche@octal31.iro.umontreal.ca hostname` → `octal31`.

3. **Desktop shortcut**: right-click desktop → New → Shortcut → target `C:\magpie\magpie.bat`.
   Then Properties → Change Icon… → browse to `magpie.ico`. Optionally set Run: **Minimized**.

## Use

Double-click the shortcut. An ssh window opens — **type the arcade password there once and leave
the window open (it IS the tunnel; minimize it)**. Chrome then pops with Magpie.
Re-clicking reuses the existing tunnel (idempotent). If the window shows an error:
- **Tunnel did not come up** → check the two `ssh` hops manually, your network/VPN, and that the
  Magpie server is actually running on octal31 (`http://localhost:8500` there).
- Different username/port? Edit the `param(...)` block at the top of `magpie.ps1`.

## What it does (for the curious)

```
ssh -N -L 8500:localhost:8500 -J huiyuche@arcade.iro.umontreal.ca huiyuche@octal31.iro.umontreal.ca   (hidden)
chrome --app=http://localhost:8500
```

Nothing is exposed publicly — the app is only reachable through your SSH session.
