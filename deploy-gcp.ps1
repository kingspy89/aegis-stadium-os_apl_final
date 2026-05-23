param(
  [string]$ProjectId = "",
  [string]$Region = "us-central1",
  [string]$Service = "aegis-stadium-os",
  [string]$Repository = "aegis-stadium-os",
  [string]$TelegramBotToken = $env:TELEGRAM_BOT_TOKEN,
  [string]$GeminiApiKey = $env:GEMINI_API_KEY,
  [string]$FirebaseProjectId = $env:FIREBASE_PROJECT_ID
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($ProjectId)) {
  $ProjectId = (gcloud config get-value project 2>$null).Trim()
}

if ([string]::IsNullOrWhiteSpace($ProjectId)) {
  throw "Set a GCP project with -ProjectId or run 'gcloud config set project PROJECT_ID'."
}

Write-Host "Building and deploying $Service to Cloud Run in $Region for project $ProjectId..."

$repoExists = gcloud artifacts repositories describe $Repository `
  --project $ProjectId `
  --location $Region `
  --format "value(name)" 2>$null

if ([string]::IsNullOrWhiteSpace($repoExists)) {
  Write-Host "Creating Artifact Registry repository $Repository in $Region..."
  gcloud artifacts repositories create $Repository `
    --project $ProjectId `
    --location $Region `
    --repository-format docker `
    --description "Docker images for $Service"
}

gcloud builds submit `
  --project $ProjectId `
  --config cloudbuild.yaml `
  .

$image = "$Region-docker.pkg.dev/$ProjectId/$Repository/$Service:latest"

$envArgs = @()
if (-not [string]::IsNullOrWhiteSpace($TelegramBotToken)) {
  $envArgs += "TELEGRAM_BOT_TOKEN=$TelegramBotToken"
}
if (-not [string]::IsNullOrWhiteSpace($GeminiApiKey)) {
  $envArgs += "GEMINI_API_KEY=$GeminiApiKey"
}
if (-not [string]::IsNullOrWhiteSpace($FirebaseProjectId)) {
  $envArgs += "FIREBASE_PROJECT_ID=$FirebaseProjectId"
}

$deployArgs = @(
  "run", "deploy", $Service,
  "--image", $image,
  "--project", $ProjectId,
  "--region", $Region,
  "--platform", "managed",
  "--allow-unauthenticated"
)

if ($envArgs.Count -gt 0) {
  $deployArgs += "--set-env-vars"
  $deployArgs += ($envArgs -join ",")
}

gcloud @deployArgs
