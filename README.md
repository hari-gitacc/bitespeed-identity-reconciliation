
```markdown
# 🔗 Bitespeed Identity Reconciliation Service

A high-performance backend service that intelligently links customer identities across multiple purchases, even when different contact information is used. Built for Bitespeed to solve the challenge of maintaining unified customer profiles in e-commerce.

## 🌟 Features

- **Smart Identity Linking**: Automatically links contacts sharing email OR phone number
- **Primary-Secondary Hierarchy**: Maintains data integrity with oldest contact as primary
- **Chain Merging**: Intelligently merges separate contact chains when new connections are discovered
- **RESTful API**: Simple POST endpoint for identity resolution
- **API Documentation**: Interactive Swagger UI for easy testing
- **Production-Ready**: Built with TypeScript, comprehensive error handling, and optimized database queries

## 🚀 Live Demo

**API Base URL**: `https://bitespeed-identity-reconciliation-j0i8.onrender.com`

**Swagger Documentation**: `https://bitespeed-identity-reconciliation-j0i8.onrender.com/api-docs`

### Quick Test
```bash
curl -X POST [YOUR_LIVE_URL_HERE]/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"mcfly@hillvalley.edu","phoneNumber":"123456"}'
```

## 📚 API Documentation

### Interactive Documentation

Visit the Swagger UI at `[YOUR_LIVE_URL_HERE]/api-docs` for interactive API documentation with the ability to test endpoints directly from your browser.

### Endpoints

#### POST /identify

Consolidates customer identity based on email and/or phone number.

**Request Body:**
```json
{
  "email": "string (optional)",
  "phoneNumber": "string (optional)"
}
```
*Note: At least one field (email or phoneNumber) must be provided*

**Response (200 OK):**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["lorraine@hillvalley.edu", "mcfly@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [23, 45]
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "Validation Error",
  "message": "Either email or phoneNumber must be provided"
}
```

#### GET /health

Health check endpoint to verify API status.

**Response (200 OK):**
```json
{
  "status": "OK",
  "timestamp": "2024-06-08T10:30:00.000Z",
  "uptime": 3600
}
```

## 🛠️ Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (Neon DB)
- **ORM**: Prisma
- **Validation**: Joi
- **Documentation**: Swagger/OpenAPI
- **Deployment**: Render.com

## 📋 Example Scenarios

### 1. New Customer Registration
```bash
curl -X POST [YOUR_LIVE_URL_HERE]/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"lorraine@hillvalley.edu","phoneNumber":"123456"}'
```

**Response:**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["lorraine@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": []
  }
}
```

### 2. Returning Customer with Different Email
```bash
curl -X POST [YOUR_LIVE_URL_HERE]/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"mcfly@hillvalley.edu","phoneNumber":"123456"}'
```

**Response:**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["lorraine@hillvalley.edu", "mcfly@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [23]
  }
}
```

### 3. Linking Two Contact Chains
```bash
# First create two separate primary contacts
curl -X POST [YOUR_LIVE_URL_HERE]/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"george@hillvalley.edu","phoneNumber":"919191"}'

curl -X POST [YOUR_LIVE_URL_HERE]/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"biffsucks@hillvalley.edu","phoneNumber":"717171"}'

# Link them together
curl -X POST [YOUR_LIVE_URL_HERE]/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"george@hillvalley.edu","phoneNumber":"717171"}'
```

**Response:**
```json
{
  "contact": {
    "primaryContatctId": 11,
    "emails": ["george@hillvalley.edu", "biffsucks@hillvalley.edu"],
    "phoneNumbers": ["919191", "717171"],
    "secondaryContactIds": [27]
  }
}
```

## 🏗️ Architecture

### Database Schema
```prisma
model Contact {
  id             Int       @id @default(autoincrement())
  phoneNumber    String?
  email          String?
  linkedId       Int?
  linkPrecedence String    // "primary" or "secondary"
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  deletedAt      DateTime?
}
```

### Identity Resolution Algorithm

1. **Search**: Find all contacts matching the provided email OR phone number
2. **Create**: If no matches, create a new primary contact
3. **Link**: If matches found, determine if new secondary contact is needed
4. **Merge**: If multiple primary contacts are discovered, merge the chains
5. **Return**: Consolidate and return all linked contact information

### Validation Rules

- **Email**: Must be a valid email format
- **Phone Number**: Must contain 1-15 digits (international standard)
- **Required**: At least one field (email or phoneNumber) must be provided

## 🚀 Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL database (or Neon DB account)
- npm or yarn

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/bitespeed-identity-reconciliation.git
cd bitespeed-identity-reconciliation
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. **Run database migrations**
```bash
npx prisma migrate dev
```

5. **Start development server**
```bash
npm run dev
```

The server will start at:
- API: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/api-docs`

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run prisma:studio` - Open Prisma Studio for database management
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:generate` - Generate Prisma client

## 🧪 Testing

### Using Swagger UI

1. Navigate to `http://localhost:3000/api-docs`
2. Click on the `/identify` endpoint
3. Click "Try it out"
4. Enter test data in the request body
5. Click "Execute"

### Using cURL

```bash
# Health check
curl http://localhost:3000/health

# Test identify endpoint
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","phoneNumber":"9876543210"}'
```

### Test Cases Covered

The service handles various edge cases:
- ✅ Creating new primary contacts
- ✅ Adding secondary contacts with partial information
- ✅ Merging two primary contact chains
- ✅ Handling null values for email or phone
- ✅ Preventing duplicate entries
- ✅ Input validation (email format, phone number format)
- ✅ Error handling for missing required fields

## 📊 Performance Optimizations

- **Indexed Fields**: Email, phoneNumber, linkedId for fast lookups
- **Efficient Queries**: Optimized database queries with proper WHERE clauses
- **Connection Pooling**: Prisma handles connection pooling automatically
- **Type Safety**: Full TypeScript implementation for reliability

## 🔒 Security Features

- **Input Validation**: Joi schema validation on all endpoints
- **SQL Injection Prevention**: Prisma ORM prevents SQL injection
- **CORS Configuration**: Configurable CORS for API access control
- **Helmet.js**: Security headers for production
- **Error Sanitization**: Different error messages for development/production

## 📈 Monitoring & Debugging

### Development
- Prisma query logging enabled
- Detailed error messages
- Request/response logging

### Production
- Health check endpoint for monitoring
- Sanitized error messages
- Performance metrics via `/health` endpoint

## 🚀 Deployment

### Deploy to Render.com

1. Push code to GitHub
2. Create new Web Service on Render
3. Configure environment variables:
   - `DATABASE_URL`: Your Neon PostgreSQL connection string
   - `NODE_ENV`: production
   - `LIVE_URL`: Your Render app URL
4. Build Command: `npm install && npx prisma generate && npm run build`
5. Start Command: `npm start`

### Environment Variables

```env
DATABASE_URL="postgresql://username:password@host/database?sslmode=require"
PORT=3000
NODE_ENV=production
LIVE_URL=https://your-app.onrender.com
```

## 🤝 Contributing

This is a submission for Bitespeed's backend engineering task. For any questions or improvements, feel free to open an issue.

## 📝 API Contract

The API strictly follows the contract specified in the Bitespeed Backend Task document:
- Request format matches the specification exactly
- Response includes `primaryContatctId` (with intentional typo)
- All edge cases from the document are handled

## 🎯 Key Design Decisions

1. **No Transactions**: Removed database transactions for better compatibility with Neon DB
2. **Validation Layer**: Joi for robust input validation
3. **Service Pattern**: Business logic separated from controllers
4. **Error Handling**: Centralized error handling middleware
5. **Documentation**: Swagger for interactive API documentation

## 📊 Database Indexes

For optimal performance, the following indexes are created:
```sql
CREATE INDEX idx_contact_email ON Contact(email);
CREATE INDEX idx_contact_phone ON Contact(phoneNumber);
CREATE INDEX idx_contact_linkedId ON Contact(linkedId);
CREATE INDEX idx_contact_precedence ON Contact(linkPrecedence);
```

---

Built with ❤️ for Bitespeed's Backend Task
