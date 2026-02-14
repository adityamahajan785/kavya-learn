pipeline {
    agent any

    environment {
        PROJECT_DIR = "/opt/kavya-learn"
    }

    stages {

        stage('Pull Latest Code') {
            steps {
                sh '''
                cd $PROJECT_DIR
                git checkout master
                git pull origin master
                '''
            }
        }

        stage('Stop Existing Containers') {
            steps {
                sh '''
                cd $PROJECT_DIR
                docker compose down || true
                '''
            }
        }

        stage('Build & Start Containers') {
            steps {
                sh '''
                cd $PROJECT_DIR
                docker compose up -d --build
                '''
            }
        }

        stage('Verify Running Containers') {
            steps {
                sh 'docker ps'
            }
        }
    }

    post {
        success {
            echo 'Deployment completed successfully!'
        }
        failure {
            echo 'Deployment failed. Check logs.'
        }
    }
}
