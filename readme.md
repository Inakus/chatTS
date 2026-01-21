Wymagania wstępne

Zanim zaczniesz, upewnij się, że masz zainstalowane środowisko Bun:

curl -fsSL https://bun.sh/install | bash

Pierwsze kroki
1. Instalacja zależności

# Instalacja dla backendu
cd backend
bun install

# Instalacja dla frontendu
cd frontend
bun install

2. Konfiguracja Bazy Danych (Drizzle ORM)

Backend wykorzystuje Drizzle ORM. Aby przygotować bazę danych SQLite, wykonaj poniższe komendy w folderze backend:

cd backend

# 1. Generowanie plików migracji (na podstawie schematu)
bun run db:generate

# 2. Synchronizacja bazy danych (utworzenie tabel)
bun run db:migrate

Uruchamianie aplikacji

Uruchom obie części aplikacji w osobnych terminalach:
Terminal 1: Backend

cd backend
bun run dev

Terminal 2: Frontend

cd frontend
bun run dev

Aplikacja będzie dostępna pod adresem wyświetlonym w konsoli.

Skrypty Bun
Backend
bun run dev	Uruchamia serwer w trybie deweloperskim (TSC + watch).
bun run build	Kompiluje TypeScript do JavaScript.
bun run start	Uruchamia produkcyjną wersję serwera.
bun run db:generate	Generuje pliki migracji SQL za pomocą Drizzle Kit.
bun run db:migrate	Wypycha zmiany schematu do bazy SQLite.
Frontend
Komenda	Opis
bun run dev	Uruchamia serwer deweloperski Vite.
bun run build	Buduje zoptymalizowaną wersję produkcyjną.
bun run lint	Sprawdza błędy w kodzie (ESLint).
bun run preview	Podgląd gotowej paczki produkcyjnej.