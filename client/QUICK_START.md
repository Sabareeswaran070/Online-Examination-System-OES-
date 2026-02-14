# Quick Start Guide - Frontend

Get the frontend running in 5 minutes!

## Prerequisites

- Node.js 16+ installed
- Backend server running (see backend README)

## Installation Steps

### 1. Navigate to Client Directory

```bash
cd "Online Examination System/client"
```

### 2. Install Dependencies

```bash
npm install
```

This will install:
- React 18
- React Router v6
- Axios
- Tailwind CSS
- React Hot Toast
- React Icons
- Recharts
- date-fns
- Vite

### 3. Configure Environment

Create `.env` file (or use existing):

```env
VITE_API_URL=http://localhost:5000/api
```

### 4. Start Development Server

```bash
npm run dev
```

The app will open at: **http://localhost:3000**

## First Login

Use these credentials based on your role:

### Super Admin
- Email: `superadmin@system.com`
- Password: `SuperAdmin@123`

### Student/Faculty
Create an account using the Register page or have an admin create your account.

## Project Structure Overview

```
client/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Page components (5 role dashboards)
│   ├── services/       # API service layer
│   ├── context/        # React Context (Auth)
│   ├── utils/          # Helper functions
│   ├── config/         # App configuration
│   ├── App.jsx         # Main app with routing
│   └── main.jsx        # Entry point
├── public/
├── .env                # Environment variables
└── package.json        # Dependencies
```

## Available Scripts

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Key Features Implemented

### ✅ Authentication
- Login/Register pages
- JWT token management
- Auto logout on token expiry
- Role-based redirects

### ✅ Role-Based Dashboards
1. **Super Admin** - System management
2. **College Admin** - College operations
3. **Department Head** - Department management
4. **Faculty** - Exam creation and grading
5. **Student** - Exam taking and results

### ✅ Exam System (Student)
- Browse available exams
- Take exams with timer
- Auto-save answers
- Tab switch detection
- Auto-submit on timeout
- View results

### ✅ UI Components
- Responsive design
- Tailwind CSS styling
- Toast notifications
- Modal dialogs
- Data tables
- Loading states

## Navigation by Role

### Super Admin Routes
- `/super-admin/dashboard` - Overview
- `/super-admin/colleges` - College management
- `/super-admin/users` - User management
- `/super-admin/analytics` - Analytics

### College Admin Routes
- `/admin/dashboard` - Dashboard
- `/admin/departments` - Departments
- `/admin/students` - Students
- `/admin/faculty` - Faculty

### Department Head Routes
- `/dept-head/dashboard` - Dashboard
- `/dept-head/subjects` - Subjects
- `/dept-head/faculty` - Faculty
- `/dept-head/students` - Students

### Faculty Routes
- `/faculty/dashboard` - Dashboard
- `/faculty/exams` - Exam management
- `/faculty/questions` - Question bank
- `/faculty/results` - Results

### Student Routes
- `/student/dashboard` - Dashboard
- `/student/exams` - Available exams
- `/student/exams/:id` - Take exam
- `/student/results` - View results

## Testing the Application

### 1. Test Authentication
1. Go to http://localhost:3000/login
2. Login as Super Admin
3. Verify dashboard loads
4. Check navigation sidebar
5. Logout

### 2. Test Student Exam Flow
1. Register as a student
2. Go to "Exams" page
3. View available exams
4. Start an exam (if active)
5. Answer questions
6. Submit exam
7. View results

### 3. Test Super Admin
1. Login as Super Admin
2. Go to "Colleges" page
3. Add a new college
4. Edit college details
5. Toggle college status

## Common Tasks

### Add a New Page

1. Create page component in `src/pages/[role]/`
2. Add route in `App.jsx`
3. Add navigation item in navigation config
4. Create API service if needed

### Create a New Component

1. Create component in `src/components/common/`
2. Export from `index.js`
3. Import and use in pages

### Add API Service

1. Add function in `src/services/index.js`
2. Use axios instance for API calls
3. Import and use in components

## Troubleshooting

### Port 3000 Already in Use
```bash
# Use different port
npm run dev -- --port 3001
```

### API Connection Failed
1. Check backend is running on port 5000
2. Verify VITE_API_URL in .env
3. Check browser console for CORS errors

### Build Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install
```

### Hot Reload Not Working
```bash
# Restart dev server
Ctrl + C
npm run dev
```

## Production Build

### Build
```bash
npm run build
```

Output will be in `dist/` directory.

### Preview Build
```bash
npm run preview
```

### Deploy

**Vercel:**
```bash
vercel
```

**Netlify:**
```bash
netlify deploy --prod --dir=dist
```

## Environment Variables in Production

Make sure to set:
```env
VITE_API_URL=https://your-backend-api.com/api
```

## Next Steps

1. ✅ Complete remaining pages (marked as "Coming Soon")
2. ✅ Add analytics charts using Recharts
3. ✅ Implement leaderboard functionality
4. ✅ Add bulk upload UI for College Admin
5. ✅ Create evaluation interface for Faculty
6. ✅ Add PDF/Excel export buttons
7. ✅ Implement real-time notifications

## Resources

- [React Documentation](https://react.dev)
- [React Router](https://reactrouter.com)
- [Tailwind CSS](https://tailwindcss.com)
- [Vite](https://vitejs.dev)
- [Axios](https://axios-http.com)

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify backend is running
3. Check API documentation
4. Review this guide

---

**Happy Coding! 🚀**
