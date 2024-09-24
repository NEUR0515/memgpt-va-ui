# Stage 1: Build the frontend
FROM node:18-alpine AS build-frontend
WORKDIR /frontend
COPY frontend/package.json ./
COPY frontend/package-lock.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Setup the backend and serve frontend
FROM python:3.11-slim
WORKDIR /app

# Install backend dependencies
COPY ./backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./

# Copy frontend build to backend's static directory
COPY --from=build-frontend /frontend/build /app/frontend/build
COPY --from=build-frontend /frontend/public/img /app/frontend/public/img

#RUN python ./delete_agents.py
#RUN python ./create_agents.py
# Expose necessary ports
EXPOSE 8000

# Run backend
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
