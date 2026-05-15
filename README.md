# 🏥 Hospital Clinical Management System (HCMS)

A production-grade, full-stack clinical management system designed for modern healthcare facilities. This platform provides a robust infrastructure for managing patients, appointments, medical records, and administrative tasks with a focus on security, scalability, and user experience.

![Dashboard Preview](https://img.shields.io/badge/Status-Production--Ready-success?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-15+-black?style=for-the-badge&logo=next.js)
![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Managed-blue?style=for-the-badge&logo=postgresql)

## 🚀 Features

- **🛡️ Secure Authentication**: JWT-based authentication with cookie support, CSRF protection, and rate limiting.
- **📊 Real-time Dashboard**: Interactive health metrics and hospital statistics using Recharts.
- **📋 Patient Management**: Comprehensive records management, including medical history and personal details.
- **📅 Appointment Scheduling**: Streamlined booking system for patients and healthcare providers.
- **📝 Clinical Documentation**: Digital health records, prescriptions, and audit logs for compliance.
- **📄 PDF Reports**: Automated generation of medical reports and invoices using PDFKit.
- **🐳 Dockerized Architecture**: Seamless deployment with Docker and Nginx reverse proxy.
- **🔍 Advanced Security**: Implements Helmet, XSS protection, HPP, and secure headers.

## 🛠️ Tech Stack

### Frontend
- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **State Management**: [TanStack Query (v5)](https://tanstack.com/query/latest)
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React
- **Charts**: Recharts

### Backend
- **Runtime**: Node.js (Express)
- **Database**: PostgreSQL
- **Security**: JWT, bcryptjs, csurf, express-rate-limit, helmet
- **API Documentation**: Swagger/OpenAPI
- **Logging**: Winston & Morgan
- **Mailing**: Nodemailer

### DevOps & Infrastructure
- **Containerization**: Docker & Docker Compose
- **Web Server**: Nginx (Reverse Proxy)
- **Process Management**: PM2 (for production)

## 📦 Getting Started

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL (if running locally without Docker)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Ananthapadmanabhan333/Hospital-Management.git
   cd Hospital-Management
   ```

2. **Backend Setup**:
   ```bash
   cd backend
   npm install
   # Create .env file based on .env.example
   npm run db:migrate
   npm run dev
   ```

3. **Frontend Setup**:
   ```bash
   cd ../frontend
   npm install
   # Create .env.local file
   npm run dev
   ```

### Running with Docker

For a full production-like environment:
```bash
docker-compose up --build
```

## 🔒 Security Implementation
- **CSRF Protection**: Implemented via `csurf`.
- **Rate Limiting**: Prevents brute-force attacks on sensitive endpoints.
- **Data Sanitization**: XSS and NoSQL injection protection.
- **Audit Logging**: Comprehensive logs for all sensitive operations.

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
Built with ❤️ for better healthcare management.
