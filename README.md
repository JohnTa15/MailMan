# OpenWebMail - Open Source Web Mail Client

A beautiful, lightweight, fast, and secure open source web mail client with support for IMAP, SMTP, EWS, and OAuth2.

## Features

- **Multi-protocol Support**: IMAP, SMTP, EWS (Exchange Web Services), Gmail, Outlook
- **OAuth2 Authentication**: Secure login with Google, Microsoft, and other providers
- **Modern UI**: Beautiful React interface with Tailwind CSS
- **Dark Mode**: Full dark mode support
- **Email Management**: Read, send, reply, forward, delete emails
- **Folder Organization**: Custom folders, labels, and categories
- **Search**: Full-text search across all emails
- **Attachments**: Upload and download attachments
- **Multi-account**: Manage multiple email accounts
- **Security First**: Helmet security headers, rate limiting, input validation

- **Backend**: NestJS with TypeScript, REST API, Swagger documentation, JWT authentication
- **Data Layer**: TypeORM with SQLite (easily switchable)
- **Protocol Support**: IMAP, SMTP, EWS (Exchange Web Services)
- **Protocol Security**: SSL/TLS encryption, OAuth2 support
- **Security Features**: Helmet, CORS, Rate Limiting, Input Validation, Password Hashing (bcrypt), SQL Injection Prevention via parameterized queries
- **UI Components**: React, Vite, Tailwind CSS, Zustand, TanStack Query, React Router
- **Project Structure**: Modular, organized, and scalable architecture with clear separation of concerns.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (React)                          │
│  - Vite + React 18 + TypeScript                              │
│  - Tailwind CSS for styling                                  │
│  - Zustand for state management                              │
│  - TanStack Query for data fetching                          │
│  - React Router for navigation                               │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Server (NestJS)                            │
│  - REST API with Swagger documentation                       │
│  - TypeORM with SQLite (easily switchable)                   │
│  - JWT authentication                                        │
│  - IMAP/SMTP protocol handlers                               │
│  - Security: Helmet, CORS, Rate Limiting                     │
└─────────────────────────────────────────────────────────────┘
```

## Getting Started

### Prerequisites

- Node.js 22+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/openwebmail.git
cd openwebmail

# Install dependencies
npm install

# Configure environment variables
cp server/.env.example server/.env
# Edit server/.env and set your values

# Start development servers
npm run dev
```

The application will be available at:
- Client: http://localhost:3000
- Server: http://localhost:3001 (API under `/api`, health check at `/health`)

Sign in with any IMAP account (Gmail, Outlook, iCloud and Yahoo are detected
automatically; for other providers open **Server settings**), or choose
**Try the demo** to explore the interface with sample mail and no server.

### Configuration

| Variable | Where | Purpose |
| --- | --- | --- |
| `JWT_SECRET` | server | Signs session tokens. **Required in production.** |
| `ENCRYPTION_KEY` | server | Encrypts stored mail passwords. **Required in production; keep it stable.** |
| `CORS_ORIGIN` | server | Comma-separated list of allowed client origins. |
| `DATABASE_PATH` | server | SQLite database file. |
| `VITE_API_URL` | client (build time) | API base URL, default `http://localhost:3001/api`. |

### Building for Production

```bash
npm run build
```

### Releases

Every push to `main` builds the Windows installer and the Android APK and
publishes them as a GitHub Release. The patch version goes up automatically
(`1.1.4` → `1.1.5`). For a bigger jump, set it yourself first and push:

```bash
node scripts/set-version.mjs 1.2.0
```

Changes that only touch Markdown files don't create a release. The apps check
for new releases themselves and offer the download.

### Docker (e.g. Raspberry Pi)

The server runs in a small container (amd64 or arm64, so a Raspberry Pi 4/5
with a 64-bit OS works). It uses roughly 100–200 MB of RAM.

```bash
cp .env.docker.example .env   # set JWT_SECRET and ENCRYPTION_KEY
docker compose up -d --build
curl http://localhost:3001/health
```

Mail data is kept in the `mailman-data` volume. The server also serves the web
app. In the desktop and Android apps, enter the server's address on the sign-in
screen; the Android app needs HTTPS (for example via Caddy, Cloudflare Tunnel
or Tailscale).

### Accounts and invites

Each person signs in to Mailman with their own account and connects any number
of mailboxes (Gmail, Outlook/Office 365, Yahoo, iCloud or any IMAP server).

- The **first account** created on a new server becomes the **admin**.
- After that the server is **invite-only**: the admin creates invite links in
  **Settings → Invites**. Each link works once and expires.

### Google and Microsoft

"Continue with Google/Microsoft" signs people in and connects their mailbox in
one step. Each provider turns on once its client ID and secret are set in `.env`
(with `PUBLIC_URL`, e.g. `PUBLIC_URL=https://mail.example.com`). Without them,
Gmail still works with an app password; Outlook/Office 365 need Microsoft.

**Google** (Google Cloud Console):
1. Enable the **Google Calendar API** for the project. *Google Auth Platform*:
   External; under *Data access* add the scopes `https://mail.google.com/` and
   `https://www.googleapis.com/auth/calendar.readonly`. Under *Audience*, set the publishing status to
   **In production** (in *Testing*, Google expires sign-ins after 7 days). Without
   Google's verification you will see an "unverified app" warning; that is fine
   for personal use (up to 100 people).
2. *Credentials → Create credentials → OAuth client ID → Web application*.
   Authorized redirect URI: `PUBLIC_URL/api/auth/oauth/google/callback`.
3. Put the client ID and secret in `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

**Microsoft** (portal.azure.com → *App registrations → New registration*):
1. Supported accounts: *Any Microsoft Entra directory and personal Microsoft
   accounts*. Redirect URI (*Web*): `PUBLIC_URL/api/auth/oauth/microsoft/callback`.
2. *Certificates & secrets → New client secret*.
3. *API permissions → Add → APIs my organization uses → Office 365 Exchange
   Online → Delegated*: `IMAP.AccessAsUser.All` and `SMTP.Send`
   (plus `offline_access`, `openid`, `email`, `profile` and `Calendars.Read`
   from Microsoft Graph).
4. Put the Application (client) ID and the secret value in `MICROSOFT_CLIENT_ID`
   and `MICROSOFT_CLIENT_SECRET`. Work accounts may need IMAP and authenticated
   SMTP enabled for the mailbox by their admin.

Restart the server after changing `.env` (`docker compose up -d`). Admins can
check the setup in **Settings → Integrations**: it shows which variables are
missing and the exact redirect URI to register.

### Calendars and shared mailboxes

The **Calendar** view shows the events of every connected account, read-only:
Google and Microsoft accounts connected with their sign-in, and iCloud and Yahoo
through CalDAV with their app password. Accounts connected before calendars
existed need to be reconnected once to allow calendar access.

Office 365 **shared mailboxes** (info@company.com) are added in *Settings →
Mailboxes* with the people icon next to a Microsoft account that has Full
Access to them. They open with that account's sign-in.

### Syncing

Mailman downloads every message of each mailbox (inbox, sent, drafts, spam,
trash and archive), newest first, in batches of 200, and checks for new mail
every minute (`SYNC_INTERVAL_SECONDS`, `0` turns background sync off). Large
attachments are not downloaded.

### AI assistants (MCP)

Each person can let an AI assistant (Claude, Cursor, or any MCP client) work
with their mail. In **Settings → AI access**, create a key and choose what it
may do:

| Access    | Tools                                         |
|-----------|-----------------------------------------------|
| Read      | `list_mailboxes`, `search_emails`, `read_email` |
| Organize  | `mark_read`, `star`, `move_to_folder`         |
| Drafts    | `create_draft`                                |

An AI key can never send mail: drafts wait in **Drafts** (marked "Written by
AI") until you open them, edit and send. The key works only on the MCP endpoint,
is stored as a hash, and every call shows up under *Recent activity*.

```bash
claude mcp add --transport http mailman https://mail.example.com/api/mcp \
  --header "Authorization: Bearer mm_your_key"
```

Other clients take the URL `https://mail.example.com/api/mcp` with the header
`Authorization: Bearer mm_your_key`. Emails come from outside senders, so treat
what an assistant reads in them as untrusted: give a key only the access it needs.

## API Documentation

Once the server is running, visit http://localhost:3001/api/docs for Swagger documentation.

## Security Features

- **Helmet**: Security HTTP headers
- **CORS**: Configurable cross-origin resource sharing
- **Rate Limiting**: Prevent abuse
- **Input Validation**: Class-validator for request sanitization
- **Encrypted Credentials**: mail passwords are stored with AES-256-GCM
- **Sandboxed Email Rendering**: message HTML is sanitized and shown in a script-less sandboxed iframe
- **JWT Tokens**: Secure authentication
- **SQL Injection Prevention**: TypeORM parameterized queries

## Email Protocol Support

### IMAP
- Automatic server discovery for major providers
- SSL/TLS encryption
- OAuth2 support for Gmail and Outlook

### SMTP
- TLS encryption
- OAuth2 support
- Attachment handling

### EWS (Exchange Web Services)
- Microsoft 365 / Exchange Server support
- Calendar integration (future)
- Contacts integration (future)

## Project Structure

```
openwebmail/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utilities
│   │   ├── services/      # API services
│   │   ├── store/         # Zustand stores
│   │   └── types/         # TypeScript types
│   └── package.json
├── server/                # NestJS backend
│   ├── src/
│   │   ├── auth/          # Authentication
│   │   ├── data/          # Data layer
│   │   ├── protocols/     # Email protocols
│   │   └── security/      # Security utilities
│   └── package.json
└── package.json
```

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [NestJS](https://nestjs.com/) - Progressive Node.js framework
- [React](https://reactjs.org/) - UI library
- [TypeORM](https://typeorm.io/) - ORM for TypeScript
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
