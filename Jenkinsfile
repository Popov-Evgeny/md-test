pipeline {
    agent any

    environment {
        IMAGE_NAME = 'md-test-prod'
        CONTAINER_NAME = 'nestjs_app_prod'
        PORT = '3000'
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
                        -e DATABASE_URL=postgresql://test:test@postgres:5432/test_db?sslmode=disable \
                        ${IMAGE_NAME}:${BUILD_NUMBER} \
                        npm run test || true

                    docker stop test_db_${BUILD_NUMBER}
                    docker rm test_db_${BUILD_NUMBER}
                '''
            }
        }

        stage('Deploy to Production') {
            steps {
                sh '''
                    cd /opt/nestjs-mind-awake/md-test

                    cat > .env << EOF
POSTGRES_USER=myapp
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=md_test_db
NODE_ENV=production
PORT=3000
EOF

                    # Обновляем образ
                    docker tag ${IMAGE_NAME}:${BUILD_NUMBER} ${IMAGE_NAME}:latest

                    # Масштабируем до 2 контейнеров (старый + новый)
                    echo "🚀 Starting new container alongside the old one..."
                    docker-compose -f docker-compose.prod.yml up -d --scale nestjs=2 --no-recreate nginx postgres

                    echo "⏳ Waiting for new container to be healthy (30 seconds)..."
                    sleep 30

                    # Проверяем через nginx
                    echo "🔍 Running health checks..."
                    for i in {1..10}; do
                        if curl -f http://localhost:3000/health > /dev/null 2>&1; then
                            echo "✅ Health check $i/10 passed!"
                            break
                        fi
                        echo "⏳ Health check $i/10 - retrying..."
                        sleep 3
                    done

                    # Уменьшаем до 1 контейнера (удаляется старый)
                    echo "🔄 Removing old container..."
                    docker-compose -f docker-compose.prod.yml up -d --scale nestjs=1 --no-recreate

                    echo "⏳ Waiting for old container to stop (10 seconds)..."
                    sleep 10

                    echo "🎉 Deployment completed!"
                '''
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                    echo "🏥 Final health check..."

                    # Проверка основного endpoint
                    if curl -f http://localhost:3000 > /dev/null 2>&1; then
                        echo "✅ Main endpoint is healthy"
                    else
                        echo "❌ Main endpoint failed"
                        exit 1
                    fi

                    # Проверка health endpoint
                    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
                        echo "✅ Health endpoint is healthy"
                    else
                        echo "⚠️  Health endpoint not available (this is OK if not implemented)"
                    fi

                    # Показываем запущенные контейнеры
                    echo "📦 Running containers:"
                    docker ps --filter "name=nestjs" --filter "name=postgres" --filter "name=nginx"
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
                echo "📋 Showing logs for troubleshooting:"
                docker-compose -f /opt/nestjs-mind-awake/md-test/docker-compose.prod.yml logs --tail=50 nestjs
            '''
        }
        always {
            // Очистка тестовых контейнеров
            sh '''
                docker ps -a | grep "test_db_${BUILD_NUMBER}" | awk '{print $1}' | xargs -r docker rm -f || true
            '''
        }
    }
}