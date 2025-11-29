pipeline {
    agent any

    environment {
        IMAGE_NAME = 'nestjs-app'
        POSTGRES_PASSWORD = credentials('postgres-password')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Docker Image') {
            steps {
                sh "docker build -t ${IMAGE_NAME}:${BUILD_NUMBER} -t ${IMAGE_NAME}:latest ."
            }
        }

        stage('Run Tests') {
            steps {
                sh '''
                    docker run -d --name test_db_${BUILD_NUMBER} \
                        -e POSTGRES_USER=test \
                        -e POSTGRES_PASSWORD=test \
                        -e POSTGRES_DB=test_db \
                        postgres:15-alpine

                    sleep 10

                    docker run --rm \
                        --link test_db_${BUILD_NUMBER}:postgres \
                        -e DATABASE_URL=postgresql://test:test@postgres:5432/test_db \
                        ${IMAGE_NAME}:${BUILD_NUMBER} \
                        npm run test || true

                    docker stop test_db_${BUILD_NUMBER}
                    docker rm test_db_${BUILD_NUMBER}
                '''
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                    cd /opt/nestjs-app

                    cat > .env << EOF
                    POSTGRES_USER=myapp
                    POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
                    POSTGRES_DB=myapp_db
                    NODE_ENV=production
                    PORT=3000
                    EOF

                    docker-compose stop nestjs || true
                    docker-compose rm -f nestjs || true

                    docker tag ${IMAGE_NAME}:${BUILD_NUMBER} ${IMAGE_NAME}:latest

                    docker-compose up -d nestjs

                    sleep 15
                '''
            }
        }

        stage('Health Check') {
            steps {
                sh 'curl -f http://localhost:3000 || exit 1'
            }
        }
    }

    post {
        success {
            echo 'Deployment successful!'
        }
        failure {
            echo 'Deployment failed!'
        }
    }
}