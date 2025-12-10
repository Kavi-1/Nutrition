



# LabelIQ Nutrition App

LabelIQ is a nutrition app that delivers personalized guidance based on each user’s health needs, preferences, and goals—helping them make informed choices and maintain a balanced diet.

## Requirements
- Java 21
- Gradle or the included Gradle wrapper
- Node.js and npm
- Expo CLI (for React Native)

## Clone the Project
```bash
git clone git@github.com:Kavi-1/Nutrition.git
cd Nutrition
```

## Compile
### Backend compile
```bash
cd backend
./gradlew build
```
### Frontend compile
React Native (Expo) does not require manual compilation.

## Run
### Run backend (Spring Boot)
From the backend folder:
```bash
./gradlew bootRun
```
### Run frontend (React Native with Expo)
From the frontend folder:
```bash
npx expo start
```
This opens the Expo developer tools.  
You can run the app on:
- iOS simulator  
- Android emulator

## Tests
### Backend tests
```bash
cd backend
./gradlew test
```
### Frontend tests
No automated frontend tests.
Frontend testing was done manually through user acceptance testing.
## Generate Coverage Reports

### Backend coverage (JaCoCo)
```bash
cd backend
./gradlew jacocoTestReport
```
Coverage report location: backend/build/reports/tests/test/index.html

## Troubleshooting
- Ensure Java 21 is installed
- Ensure Expo CLI is installed
- Make sure backend and frontend commands are run from the correct folders
- If the backend fails to start, check port conflicts
- If Expo cannot find your device, make sure you are on the same WiFi network
- Supabase Access Issues: If tests fail due to database access issues and you’re on a network that blocks connections (e.g. school Wi-Fi), try switching to a personal hotspot
- Simulator Installation (iOS/Android): Ensure that the iOS simulator (for macOS users) or Android emulator is installed for frontend testing