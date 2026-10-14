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

### Docker (e.g. Raspberry Pi)

The server runs in a small container (amd64 or arm64, so a Raspberry Pi 4/5
with a 64-bit OS works). It uses roughly 100–200 MB of RAM.

```bash
cp .env.docker.example .env   # set JWT_SECRET and ENCRYPTION_KEY
docker compose up -d --build
curl http://localhost:3001/health
```

Mail data is kept in the `mailman-data` volume. Point the apps at the server
by building the client with `VITE_API_URL=https://your-host/api`; the Android
app needs HTTPS (for example via Cloudflare Tunnel or Tailscale).

Google/Facebook sign-in is optional and stays off until both the client ID and
secret for a provider are set.

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
