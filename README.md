# Wavelength Workshop Demo

A minimal, self-custodial Bitcoin/Lightning wallet built on
[Wavelength](https://wavelength.lightning.engineering/), running entirely
in your browser. **Bitcoin Signet only — test coins with no real value.**

This is a workshop/conference demo, not a production wallet. It exists so
attendees can create a Signet wallet on their own laptop, send/receive a
test Lightning payment, and see how a self-custodial browser wallet
behaves — nothing here talks to a shared backend or server; every
instance is fully independent and local to the machine running it.

## Quick start

Requires [git](https://git-scm.com/) — everything else is checked and,
if missing, the script offers to install it for you.

```bash
git clone https://github.com/beeforbacon/wavelength-workshop-demo.git
cd wavelength-workshop-demo
./scripts/setup-station.sh
```

This installs dependencies (Node.js, pnpm — offered automatically if not
already on your machine), fetches the pinned Wavelength WASM runtime, and
starts the app. Once it's running, open the printed
`http://localhost:5175/` URL in your browser.

To set up without immediately starting the server:

```bash
./scripts/setup-station.sh --no-start
```

## Why `localhost`, not a shared link

Wavelength requires a browser "secure context" (`crypto.subtle`, plus
strict cross-origin-isolation headers) to run its wallet engine. Browsers
only grant that for `https://` or `localhost` — a plain `http://` address
on a local network (e.g. `192.168.x.x`) will not work. That's why each
attendee runs their own local copy rather than everyone connecting to one
shared instance.

## Sending a test payment to someone else

Each wallet here is independent and self-contained — there's no directory
or account system connecting instances. To send Signet sats between two
people running this demo:

1. On the receiving wallet, open **Receive** and generate a Lightning
   invoice (or an on-chain address).
2. Share that invoice/address with the sender (show the QR code, or copy
   the text).
3. On the sending wallet, open **Send**, paste it in, and confirm.

## Getting Signet test funds

New wallets start empty. Use a public Signet faucet (for example
`https://robinet.eldamar.icu/`) to send yourself test coins via an
on-chain deposit address generated from the **Receive** screen. Faucets
can take several minutes to confirm and may not support paying a
Lightning invoice directly — check the faucet's own instructions.

## What this is not

- Not a production wallet, and not connected to any commercial service.
- Not custodial — nobody but the browser running it holds the wallet's
  keys. If you clear your browser storage or lose the device before
  backing up your recovery phrase, the wallet is gone for good.
- Signet only. Do not send real Bitcoin to any address generated here.

## Troubleshooting

- **Setup script says a dependency is missing and you decline the
  install prompt:** install it yourself using the link the script
  prints, then re-run `./scripts/setup-station.sh`.
- **Blank page / wallet won't start:** confirm you're on
  `http://localhost:5175/`, not a LAN IP, and that no browser extension
  is stripping response headers (Wavelength needs strict cross-origin
  isolation headers to boot its WASM engine).
- **`pnpm run fetch:runtime` fails:** check your network connection; it
  downloads the Wavelength runtime from a GitHub release and needs
  outbound HTTPS access.
