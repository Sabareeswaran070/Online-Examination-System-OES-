# Online Examination System - Frontend

A modern, scalable React.js frontend for the Online Examination System with role-based access control and comprehensive exam management features.

## 🚀 Features

### Authentication & Authorization
- ✅ JWT-based authentication
- ✅ Role-based protected routing (5 roles)
- ✅ Secure login/registration
- ✅ Auto token refresh
- ✅ Session management

### User Roles

#### 1. Super Admin
- Platform-wide management
- College CRUD operations
- User management
- System analytics
- Audit logs viewing

#### 2. College Admin
- College operations management
- Department management
- Student/Faculty management
- Bulk student upload
- College-wide analytics

#### 3. Department Head
- Department operations
- Subject management
- Faculty assignment
- Faculty workload tracking
- Exam approval

#### 4. Faculty
- Exam creation and management
- Question bank management
- Student evaluation
- Results management
- Performance analytics

#### 5. Student
- Exam participation
- Real-time exam taking
- Results viewing
- Performance analytics
- Leaderboard access

### Exam System Features
- ✅ Timer-based exams with countdown
- ✅ Auto-save functionality
- ✅ Tab switch detection
- ✅ Multiple question types (MCQ, Descriptive, True/False, Coding)
- ✅ Question navigation
- ✅ Auto-submit on timeout
- ✅ Violation tracking

### UI/UX Features
- ✅ Responsive design (mobile-first)
- ✅ Modern Tailwind CSS styling
- ✅ Smooth animations
- ✅ Loading states
- ✅ Toast notifications
- ✅ Modal dialogs
- ✅ Data tables
- ✅ Charts and analytics

## 📦 Technology Stack

- **React 18** - UI library
- **React Router v6** - Client-side routing
- **Context API** - State management
- **Axios** - HTTP client
- **Tailwind CSS** - Utility-first CSS
- **Vite** - Build tool
- **React Icons** - Icon library
- **React Hot Toast** - Notifications
- **Recharts** - Data visualization
- **date-fns** - Date utilities

## 📁 Project Structure

```
client/
├── public/
├── src/
│   ├── components/
│   │   ├── common/          # Reusable components
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Table.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Badge.jsx
│   │   │   ├── Loader.jsx
│   │   │   ├── Select.jsx
│   │   │   └── Textarea.jsx
│   │   ├── layout/          # Layout components
│   │   │   ├── Navbar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── DashboardLayout.jsx
│   │   ├── dashboard/       # Dashboard components
│   │   │   └── StatCard.jsx
│   │   └── ProtectedRoute.jsx
│   ├── config/
│   │   └── constants.js     # App constants
│   ├── context/
│   │   └── AuthContext.jsx  # Authentication context
│   ├── pages/
│   │   ├── auth/           # Auth pages
│   │   │   ├── Login.jsx
│   │   │   └── Register.jsx
│   │   ├── superadmin/     # Super admin pages
│   │   │   ├── Dashboard.jsx
│   │   │   └── Colleges.jsx
│   │   ├── admin/          # College admin pages
│   │   │   └── Dashboard.jsx
│   │   ├── depthead/       # Dept head pages
│   │   │   └── Dashboard.jsx
│   │   ├── faculty/        # Faculty pages
│   │   │   └── Dashboard.jsx
│   │   ├── student/        # Student pages
│   │   │   ├── Dashboard.jsx
│   │   │   ├── AvailableExams.jsx
│   │   │   ├── TakeExam.jsx
│   │   │   └── Results.jsx
│   │   ├── Unauthorized.jsx
│   │   └── NotFound.jsx
│   ├── services/
│   │   ├── api.js          # Axios instance
│   │   └── index.js        # API services
│   ├── utils/
│   │   ├── dateUtils.js    # Date utilities
│   │   └── helpers.js      # Helper functions
│   ├── App.jsx             # Main app component
│   ├── main.jsx            # Entry point
│   └── index.css           # Global styles
├── .env                     # Environment variables
├── .env.example
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ installed
- Backend server running on port 5000

### Installation

1. Navigate to client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

4. Start development server:
```bash
npm run dev
```

The application will open at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## 🎨 Component Library

### Common Components

**Button**
```jsx
<Button variant="primary" size="md" fullWidth loading={false}>
  Click Me
</Button>
```

**Input**
```jsx
<Input label="Email" type="email" required error={errors.email} />
```

**Card**
```jsx
<Card title="Dashboard" action={<Button>Action</Button>}>
  Content
</Card>
```

**Table**
```jsx
<Table columns={columns} data={data} onRowClick={handleClick} />
```

**Modal**
```jsx
<Modal isOpen={open} onClose={handleClose} title="Title" size="md">
  Content
</Modal>
```

## 🔐 Authentication Flow

1. User logs in with credentials
2. Backend issues JWT token
3. Token stored in localStorage
4. Token added to all API requests via interceptor
5. Protected routes check authentication
6. Auto-redirect based on user role

## 🛣️ Routing Structure

### Public Routes
- `/login` - Login page
- `/register` - Registration page

### Protected Routes (by role)

**Super Admin**
- `/super-admin/dashboard`
- `/super-admin/colleges`
- `/super-admin/users`
- `/super-admin/analytics`
- `/super-admin/audit-logs`

**College Admin**
- `/admin/dashboard`
- `/admin/departments`
- `/admin/students`
- `/admin/faculty`
- `/admin/analytics`
- `/admin/leaderboard`

**Department Head**
- `/dept-head/dashboard`
- `/dept-head/subjects`
- `/dept-head/faculty`
- `/dept-head/students`
- `/dept-head/exams`
- `/dept-head/analytics`

**Faculty**
- `/faculty/dashboard`
- `/faculty/exams`
- `/faculty/questions`
- `/faculty/results`
- `/faculty/evaluate`

**Student**
- `/student/dashboard`
- `/student/exams`
- `/student/exams/:id` (Exam taking - full screen)
- `/student/results`
- `/student/leaderboard`
- `/student/analytics`

## 📊 State Management

### Context API

**AuthContext** - Global authentication state
- User information
- Authentication status
- Login/Logout functions
- Token management

```jsx
const { user, isAuthenticated, login, logout } = useAuth();
```

## 🎯 Key Features Implementation

### Exam Taking Interface

- Real-time countdown timer
- Question navigation grid
- Answer auto-save every 30 seconds
- Tab switch detection
- Auto-submit on timeout
- Support for multiple question types
- Visual indicators for answered questions

### Dashboard Components

- Role-specific statistics cards
- Recent activity feeds
- Quick action buttons
- Performance charts
- Leaderboard displays

### Responsive Design

- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Touch-friendly UI
- Optimized for tablets and phones

## 🎨 Styling Guide

### Tailwind Classes

**Colors:**
- Primary: `bg-primary-600`, `text-primary-600`
- Success: `bg-green-600`, `text-green-600`
- Danger: `bg-red-600`, `text-red-600`
- Warning: `bg-yellow-600`, `text-yellow-600`

**Custom Classes:**
- `.btn-primary` - Primary button
- `.card` - Card container
- `.input-field` - Input field
- `.stat-card` - Statistics card
- `.badge` - Badge/Tag

## 📱 API Integration

All API calls use centralized service layer:

```javascript
import { studentService } from '../services';

const exams = await studentService.getAvailableExams();
const result = await studentService.submitExam(examId, answers);
```

## 🔧 Configuration

### Environment Variables

```env
VITE_API_URL=http://localhost:5000/api
```

### Constants

Edit `src/config/constants.js` for:
- API endpoints
- User roles
- Exam types
- Question types
- Routes

## 🚀 Deployment

### Vite Build

```bash
npm run build
```

Output: `dist/` directory

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

### Deploy to Netlify

```bash
npm run build
netlify deploy --prod --dir=dist
```

## 🧪 Testing

### Manual Testing Checklist

- [ ] Login/Logout functionality
- [ ] Role-based routing
- [ ] Exam taking flow
- [ ] Timer functionality
- [ ] Auto-save
- [ ] Tab switch detection
- [ ] Responsive design
- [ ] Toast notifications

## 🐛 Troubleshooting

### Common Issues

**1. API Connection Error**
- Check backend server is running
- Verify VITE_API_URL in .env
- Check CORS settings

**2. Blank Page**
- Check browser console for errors
- Verify all dependencies installed
- Clear browser cache

**3. Routing Issues**
- Check user role matches route
- Verify token is valid
- Check ProtectedRoute logic

## 📄 License

This project is part of the Online Examination System.

## 👥 Support

For issues and questions:
- Check backend API documentation
- Review component documentation
- Check browser console for errors

---

**Built with ❤️ using React 18 and Tailwind CSS**
