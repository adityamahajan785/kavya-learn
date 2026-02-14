pipeline {
    agent any

    stages {

        stage('Checkout Code') {
            steps {
                checkout scm
            }
        }

        stage('Copy ENV File') {
            steps {
                sh '''
                cp /root/kavya-learn/backend/.env backend/.env
                '''
            }
        }

        stage('Stop Old Containers') {
            steps {
                sh '''
                docker compose down || true
                '''
            }
        }

        stage('Build & Deploy Containers') {
            steps {
                sh '''
                docker compose up -d --build
                '''
            }
        }

        stage('Verify Running Containers') {
            steps {
                sh '''
                docker ps
                '''
            }
        }
    }
}
