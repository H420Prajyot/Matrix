# Overview

SecureVAPT is a comprehensive Vulnerability Assessment and Penetration Testing platform designed to streamline the security assessment workflow. The application serves three distinct user roles: administrators who manage users and projects, penetration testers who conduct assessments and report vulnerabilities, and clients who monitor their project progress and review security findings. The platform features role-based dashboards, real-time project tracking, vulnerability management, report generation, and file upload capabilities for security documentation.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client-side is built with **React 18** using **TypeScript** and **Vite** as the build tool. The UI leverages **shadcn/ui** components with **Radix UI** primitives and **Tailwind CSS** for styling. State management is handled through **TanStack React Query** for server state and local React state for UI interactions. The application uses **Wouter** for client-side routing with role-based route protection.

## Backend Architecture
The server is built with **Express.js** and **TypeScript**, following a RESTful API design pattern. The application implements a layered architecture with clear separation between routes, business logic (storage layer), and database operations. Authentication is handled through **Replit's OIDC integration** with **Passport.js**, using **express-session** for session management with PostgreSQL session storage.

## Database Design
The system uses **PostgreSQL** as the primary database with **Drizzle ORM** for type-safe database operations. The schema includes tables for users, projects, project assignments, vulnerabilities, reports, audit logs, notifications, and sessions. Key design decisions include:
- **Enum types** for user roles, project statuses, vulnerability severities, and audit actions
- **Foreign key relationships** to maintain data integrity
- **Timestamp tracking** for all entities
- **JSONB fields** for flexible metadata storage

## Authentication & Authorization
Authentication uses **Replit's OIDC provider** with role-based access control. Users are assigned roles (admin, pentester, client) that determine dashboard access and API permissions. Session management is handled through PostgreSQL-backed sessions with configurable TTL. The system includes middleware for route protection and user context injection.

## File Management
File uploads are handled through **Multer** with local disk storage. The system supports PDF, DOCX, and JSON file types with a 50MB size limit. Uploaded files are stored in an `uploads` directory with unique filename generation to prevent conflicts.

## API Design
The REST API follows conventional HTTP methods and status codes. Key endpoints include:
- Authentication routes (`/api/auth/*`)
- User management (`/api/users/*`)
- Project operations (`/api/projects/*`)
- Vulnerability tracking (`/api/vulnerabilities/*`)
- Report handling (`/api/reports/*`)
- Dashboard statistics (`/api/dashboard/*`)

All API responses are JSON-formatted with consistent error handling and logging middleware.

# External Dependencies

## Database Services
- **Neon Database** - Serverless PostgreSQL hosting with connection pooling
- **@neondatabase/serverless** - WebSocket-enabled database client for serverless environments

## Authentication Provider
- **Replit OIDC** - OAuth 2.0/OpenID Connect provider for user authentication
- **connect-pg-simple** - PostgreSQL session store for Express sessions

## UI Component Libraries
- **Radix UI** - Headless component primitives for accessibility and functionality
- **shadcn/ui** - Pre-built component library built on Radix UI
- **Lucide React** - Icon library for consistent UI iconography

## Development Tools
- **Vite** - Fast build tool with HMR and plugin ecosystem
- **Drizzle Kit** - Database migration and schema management tool
- **TypeScript** - Type safety across the entire application stack

## File Processing
- **Multer** - Multipart form data handling for file uploads
- Local file system storage for uploaded security reports and documentation

## Styling & Design
- **Tailwind CSS** - Utility-first CSS framework with custom design system
- **PostCSS** - CSS processing with autoprefixer for browser compatibility
- **CSS Variables** - Dynamic theming system for light/dark mode support