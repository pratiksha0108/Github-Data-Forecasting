# Github-Data-Forecasting

## Live portfolio experience: Repo Radar

[Open Repo Radar](https://pratiksha0108.github.io/Github-Data-Forecasting/) to explore real public GitHub activity, compare four statistical baselines, and stress-test a hypothetical capacity plan.

The browser experience is in `demo/`. It uses an attributed fixed snapshot of Flask and Jinja metadata, not synthetic history. It does not run the separate LSTM, Prophet, Flask or GCP services described below.

- 36 complete monthly observations per repository, October 2023 through September 2026.
- Six rolling one-month model tests with MAE and WAPE, plus per-month prediction inspection.
- Local-only CSV import, adjustable volume/capacity/queue assumptions, CSV/JSON exports and a decision brief.
- No API key or paid service required. Reduced-motion and keyboard interactions supported.

### Run and verify this version

```sh
npm ci
npm test
npm run build
python3 -m http.server 4321 --bind 127.0.0.1 --directory site
```

Open http://127.0.0.1:4321/. The build packages the code and attributed dataset into one versioned browser file. It requires no separate JSON request or external font service at startup. A timed recovery screen handles missing or interrupted release assets. Publish `site/`, not the editable `demo/` source directory.

To reproduce the bundled data extraction with Node 24 and internet access:

```sh
node scripts/refresh-demo-data.mjs
```

The script fetches public metadata, aggregates monthly counts and writes `demo/data/snapshot.json` only after complete retrieval. Unauthenticated API rate limits apply. Inspect the snapshot diff and run tests before committing a refresh. No refresh runs automatically on visitors' browsers.

[Product brief, methodology and evaluation plan](docs/repo-radar-product-brief.md)

### Limitations

This is an independent portfolio experiment, not a production staffing or forecasting service. Counts are not productivity. Six one-month tests do not establish longer-horizon accuracy; the model winner is selected on the evaluation period without an independent final test set. Planning capacity and backlog are hypothetical.

## Original project and services

An interactive dashboard that retrieves GitHub repository data using the GitHub API, visualizes trends with charts, and forecasts key metrics using machine learning models like LSTM, Facebook Prophet, and StatsModel. Built with Flask, React, and Docker.


## Features

- **GitHub API Integration**: Fetches repository data (issues, stars, forks, commits, pull requests, contributors, etc.).
- **Data Visualization**: Line charts, bar charts, and stacked bar charts for repo trends.
- **Machine Learning Forecasting**:
  - LSTM (TensorFlow/Keras)
  - Facebook Prophet
  - StatsModel
- **Microservices Architecture**: Flask for backend, React for frontend, deployed using Docker & Google Cloud.

## Tech Stack

| Stack                  | Technologies Used                                     |
|------------------------|-------------------------------------------------------|
| **Back-End**           | Python (Flask), GitHub API                            |
| **Front-End**          | React, JavaScript                                     |
| **Machine Learning**   | TensorFlow/Keras (LSTM), Facebook Prophet, StatsModel |
| **Data Visualization** | Chart.js, Recharts                                    |
| **Deployment**         | Docker, Google Cloud                                          |

##  Data Visualization

- **Line Chart**: Issues over time for each repository.
- **Bar Charts**:
  - Issues created per month for each repository.
  - Stars, forks, and closed issues per repository.
- **Stacked Bar Chart**: Created vs. closed issues.
- **Forecasting Charts**:
  - Predicted trends for issues, pull requests, commits, branches, contributors, and releases.

## Forecasting Objectives

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

- cd backend
- python -m venv venv
- source venv/bin/activate  # On Windows: venv\Scripts\activate
- pip install -r requirements.txt
- flask run

### Frontend Setup (React)

- cd frontend
- npm install
- npm start

### Deploying with Docker
- docker-compose up --build

## Additional Documentation
For a deeper understanding of each module, refer to the individual README files inside each component:

- **Flask/readme.txt**: Details on GitHub API data retrieval, setup procedures, forecasting pipeline, and Google Cloud deployment instructions.
- **Forecasting/readme.txt**: Information about LSTM implementation, time series forecasting, and Google Cloud Storage configuration.
- **React/readme.txt**: Setup instructions for React frontend, component architecture, and UI implementation details.
