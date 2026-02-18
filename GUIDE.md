# 🚀 Grammatic Deployment Guide

This guide covers how to deploy the Grammatic application using Docker on a fresh machine and how to upload the project to GitHub.

---

## 📦 Part 1: GitHub Import

Since I cannot access your GitHub account directly, follow these steps to upload your project:

### 1. Initialize Git (if not already done)
Open your terminal in the project folder (`c:\Project\Grammatic`) and run:
```bash
git init
git add .
git commit -m "Initial commit: Grammatic Release 2.0"
```

### 2. Create a Repository on GitHub
1. Go to [GitHub.com](https://github.com) and sign in.
2. Click the **+** icon in the top right and select **New repository**.
3. Name it `grammatic-ai` (or whatever you prefer).
4. **Important:** Do NOT check "Add a README file" or .gitignore (we already have them).
5. Click **Create repository**.

### 3. Push to GitHub
Copy the commands shown on GitHub under "…or push an existing repository from the command line". They will look like this:
```bash
git remote add origin https://github.com/YOUR_USERNAME/grammatic-ai.git
git branch -M main
git push -u origin main
```

---

## 🐳 Part 2: Deployment with Docker (From Scratch)

Follow these steps to deploy the application on a **fresh machine** (e.g., a VPS or another computer).

### Prerequisites
1. **Install Docker Desktop** (Windows/Mac) or **Docker Engine** (Linux).
   - [Download Docker](https://www.docker.com/products/docker-desktop/)
2. **Install Git** to clone the repository.

### Step-by-Step Deployment

#### 1. Clone the Repository
On the new machine, open the terminal/command prompt:
```bash
git clone https://github.com/YOUR_USERNAME/grammatic-ai.git
cd grammatic-ai
```

#### 2. Configure Environment Variables
**CRITICAL STEP:** You must create the `.env` file because it is ignored by Git for security.

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Copy the example file:
   - **Windows:** `copy .env.example .env`
   - **Linux/Mac:** `cp .env.example .env`
3. Open `.env` and **paste your real API keys**:
   ```ini
   GEMINI_API_KEY="your_actual_key_here"
   OPENAI_API_KEY="your_actual_key_here"
   ```
4. Return to the root folder:
   ```bash
   cd ..
   ```

#### 3. Start the Application
Run the following command to build and start the containers:
```bash
docker-compose up -d --build
```
- `up`: Starts the containers.
- `-d`: Detached mode (runs in the background).
- `--build`: Forces a rebuild of the images to ensure you have the latest code.

#### 4. Verify Deployment
Check if the services are running:
```bash
docker-compose ps
```

Access the application:
- **Frontend:** [http://localhost:8080](http://localhost:8080)
- **Backend API:** [http://localhost:8003/docs](http://localhost:8003/docs)

### 🌡️ Troubleshooting

**If containers fail to start:**
View the logs to see the error:
```bash
docker-compose logs -f
```

**If you updated the code:**
Pull the latest changes and restart:
```bash
git pull origin main
docker-compose up -d --build
```

**To stop everything:**
```bash
docker-compose down
```
