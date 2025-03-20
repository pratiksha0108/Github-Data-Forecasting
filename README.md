# Github-Data-Forecasting
An interactive dashboard that retrieves GitHub repository data using the GitHub API, visualizes trends with charts, and forecasts key metrics using machine learning models like LSTM, Facebook Prophet, and StatsModel. Built with Flask, React, and Docker.


## 🚀 Features

- **GitHub API Integration**: Fetches repository data (issues, stars, forks, commits, pull requests, contributors, etc.).
- **Data Visualization**: Line charts, bar charts, and stacked bar charts for repo trends.
- **Machine Learning Forecasting**:
  - LSTM (TensorFlow/Keras)
  - Facebook Prophet
  - StatsModel
- **Microservices Architecture**: Flask for backend, React for frontend, deployed using Docker & Google Cloud.

## 🛠️ Tech Stack

| Stack                  | Technologies Used                                     |
|------------------------|-------------------------------------------------------|
| **Back-End**           | Python (Flask), GitHub API                            |
| **Front-End**          | React, JavaScript                                     |
| **Machine Learning**   | TensorFlow/Keras (LSTM), Facebook Prophet, StatsModel |
| **Data Visualization** | Chart.js, Recharts                                    |
| **Deployment**         | Docker, Google Cloud                                          |

## 📊 Data Visualization

- **Line Chart**: Issues over time for each repository.
- **Bar Charts**:
  - Issues created per month for each repository.
  - Stars, forks, and closed issues per repository.
- **Stacked Bar Chart**: Created vs. closed issues.
- **Forecasting Charts**:
  - Predicted trends for issues, pull requests, commits, branches, contributors, and releases.

## 🔮 Forecasting Objectives

Using ML models, we predict:
1. The day of the week with the maximum number of issues created.
2. The day of the week with the maximum number of issues closed.
3. The month with the highest number of closed issues.
4. Future trends for issues, pulls, commits, branches, contributors, and releases.


### Prerequisites
- Python 3.8+
- Node.js & npm
- Docker (for deployment)

### Backend Setup (Flask API)
```sh
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
flask run

### Frontend Setup (React)
cd frontend
npm install
npm start

### Deploying with Docker
docker-compose up --build

## Additional Documentation:
For a deeper understanding of each module, refer to the individual README files inside:

Flask/readme.txt → Details on Flask API & GitHub Data Retrieval.
Forecasting/readme.txt → Setup instructions for React Frontend.
React/readme.txt → Machine Learning forecasting using LSTM.

