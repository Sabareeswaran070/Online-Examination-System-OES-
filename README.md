# Online Examination System MERN

A comprehensive web-based examination system built with the MERN stack (MongoDB, Express.js, React, Node.js).

## Features

### User Roles
- **Super Admin**: Manage colleges, users, system settings, and global competitions.
- **College Admin**: Manage departments, faculty, students, and college-level settings.
- **Department Head**: Oversee subjects and faculty within a department.
- **Faculty**: Create exams, manage question banks, and evaluate results.
- **Student**: Take exams, view results, participate in competitions, and track performance.

### Key Functionalities
- **Secure Authentication**: JWT-based auth with Role-Based Access Control (RBAC).
- **Exam Management**: Create scheduled exams with various question types (MCQ, Descriptive, Coding).
- **Live Exam Interface**: Timer-based exams with auto-submission and tab-switch detection.
- **Competition Module**: Global hackathons and leaderboards.
- **Automated Evaluation**: Instant scoring for MCQs and manual grading for descriptive answers.
- **Analytics**: Performance charts and statistical insights for all roles.

## Tech Stack

- **Frontend**: React.js, Tailwind CSS, Vite
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Authentication**: JWT, bcryptjs

## Setup Instructions

### Prerequisites
- Node.js (v14+)
- MongoDB (Local or Atlas)

### Installation

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd Online-Examination-System
    ```

2.  **Install Backend Dependencies**
    ```bash
    npm install
    ```

3.  **Install Frontend Dependencies**
    ```bash
    cd client
    npm install
    cd ..
    ```

4.  **Environment Variables**
    Create a `.env` file in the root directory:
    ```env
    PORT=5000
    MONGO_URI=your_mongodb_connection_string
    JWT_SECRET=your_jwt_secret_key
    NODE_ENV=development
    ```

5.  **Run the Application**
    Open two terminals:

    *Terminal 1 (Backend):*
    ```bash
    node server.js
    ```

    *Terminal 2 (Frontend):*
    ```bash
    cd client
    npm run dev
    ```

6.  **Access the App**
    Open `http://localhost:5173` (or the port shown in your terminal).

## Project Structure

- `/client`: React frontend
    - `/src/pages`: Page components by role
    - `/src/components`: Reusable UI components
    - `/src/services`: API service integration
- `/controllers`: Backend logic
- `/models`: Mongoose schemas
- `/routes`: API endpoints
- `/middleware`: Auth and validation middleware

## License
MIT
