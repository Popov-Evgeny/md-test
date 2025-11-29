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
            docker tag md-test-prod:${BUILD_NUMBER} md-test-prod:latest

            # Запускаем новый контейнер на временном порту 3002
            docker run -d \
                --name nestjs_app_new \
                --network md-test_app_network_prod \
                -e NODE_ENV=production \
                -e DATABASE_URL=postgresql://myapp:${POSTGRES_PASSWORD}@postgres:5432/md_test_db?sslmode=disable \
                -e PORT=3000 \
                -p 3002:3000 \
                md-test-prod:latest

            # Ждём запуска
            sleep 15

            # Проверяем что новый контейнер работает
            curl -f http://localhost:3002 || exit 1

            echo "✅ New container is healthy!"

            # Останавливаем nginx для переключения портов (если используется)
            # или переключаем docker port mapping

            # Останавливаем старый контейнер
            docker stop nestjs_app_prod || true

            # Удаляем маппинг старого контейнера
            docker rm nestjs_app_prod || true

            # Переименовываем новый контейнер в основной
            docker stop nestjs_app_new
            docker rm nestjs_app_new

            # Запускаем финальный контейнер на порту 3000
            docker run -d \
                --name nestjs_app_prod \
                --restart unless-stopped \
                --network md-test_app_network_prod \
                -e NODE_ENV=production \
                -e DATABASE_URL=postgresql://myapp:${POSTGRES_PASSWORD}@postgres:5432/md_test_db?sslmode=disable \
                -e PORT=3000 \
                -p 3000:3000 \
                md-test-prod:latest

            sleep 5
        '''
    }
}