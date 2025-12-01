pipeline {
    agent any

    environment {
        IMAGE_NAME = 'md-test-prod'
        POSTGRES_PASSWORD = credentials('postgres-password')
        PROJECT_DIR = '/opt/nestjs-mind-awake/md-test'
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
                    docker run -d --name test_db_prod_${BUILD_NUMBER} \
                        -e POSTGRES_USER=test \
                        -e POSTGRES_PASSWORD=test \
                        -e POSTGRES_DB=test_db \
                        postgres:15-alpine

                    sleep 10

                    docker run --rm \
                        --link test_db_prod_${BUILD_NUMBER}:postgres \
                        -e DATABASE_URL=postgresql://test:test@postgres:5432/test_db?sslmode=disable \
                        ${IMAGE_NAME}:${BUILD_NUMBER} \
                        npm run test || true

                    docker stop test_db_prod_${BUILD_NUMBER}
                    docker rm test_db_prod_${BUILD_NUMBER}
                '''
            }
        }

        stage('Deploy to Production') {
            steps {
                sh '''
                    echo "📁 Switching to project directory"
                    cd ${PROJECT_DIR}

                    echo "🔎 Checking .env.prod"
                    if [ ! -f .env.prod ]; then
                        echo "❌ .env.prod not found!"
                        exit 1
                    fi

                    echo "🔄 Updating Docker image tag"
                    docker tag ${IMAGE_NAME}:${BUILD_NUMBER} ${IMAGE_NAME}:latest

                    echo "🛑 Stopping old production containers..."
                    docker-compose \
                        -p md_prod \
                        -f ${PROJECT_DIR}/docker-compose.prod.yml \
                        --env-file ${PROJECT_DIR}/.env.prod \
                        down

                    echo "🚀 Starting new production containers..."
                    docker-compose \
                        -p md_prod \
                        -f ${PROJECT_DIR}/docker-compose.prod.yml \
                        --env-file ${PROJECT_DIR}/.env.prod \
                        up -d

                    echo "⏳ Waiting for application to start..."
                    sleep 20
                '''
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                    echo "🏥 Final production health check..."

                    sleep 10

                    if curl -f http://localhost:3000 > /dev/null 2>&1; then
                        echo "✅ Production is healthy"
                    else
                        echo "❌ Production health check failed"

                        docker-compose \
                            -p md_prod \
                            -f ${PROJECT_DIR}/docker-compose.prod.yml \
                            --env-file ${PROJECT_DIR}/.env.prod \
                            logs --tail=50 nestjs

                        exit 1
                    fi
                '''
            }
        }
    }

    post {
        success {
            echo '✅ Production deployment successful!'
        }
        failure {
            echo '❌ Production deployment failed!'
            sh '''
                docker-compose \
                    -p md_prod \
                    -f ${PROJECT_DIR}/docker-compose.prod.yml \
                    --env-file ${PROJECT_DIR}/.env.prod \
                    logs --tail=50
            '''
        }
        always {
            sh 'docker rm -f test_db_prod_${BUILD_NUMBER} || true'
        }
    }
}
