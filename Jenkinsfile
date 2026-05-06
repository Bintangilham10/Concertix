pipeline {
    agent {
        node {
            label 'built-in'
            customWorkspace '/workspace'
        }
    }

    parameters {
        booleanParam(
            name: 'STRICT_SECURITY_GATES',
            defaultValue: false,
            description: 'Fail pipeline on dependency/image/DAST findings. Turn on for final DevSecOps demo.'
        )
    }

    options {
        skipDefaultCheckout(true)
        timestamps()
        ansiColor('xterm')
    }

    environment {
        COMPOSE = 'docker compose'
        COMPOSE_PROJECT_NAME = 'concertix'
        RUNTIME_COMPOSE_FILES = '-f docker-compose.yml -f docker-compose.jenkins.yml'
        BACKEND_URL = 'http://backend:8000'
        FRONTEND_URL = 'http://frontend:3000'
        SONAR_HOST_URL = 'http://sonarqube:9000'
        REDIS_URL = 'redis://redis:6379/0'
        RATE_LIMIT_STORAGE_URL = 'redis://redis:6379/0'
        DEBUG = 'true'
        EXPOSE_API_DOCS = 'true'
        EXPOSE_METRICS = 'true'
        TOKEN_BLACKLIST_FAIL_CLOSED = 'false'
        TRUST_PROXY_HEADERS = 'false'
        JWT_SECRET_KEY = 'local_jenkins_ci_secret_only'
        CORS_ALLOWED_ORIGIN = 'http://localhost:3000'
        MIDTRANS_SERVER_KEY = 'SB-Mid-server-local-placeholder'
        MIDTRANS_CLIENT_KEY = 'SB-Mid-client-local-placeholder'
        MIDTRANS_IS_PRODUCTION = 'false'
        NEXT_TELEMETRY_DISABLED = '1'
        NEXT_PUBLIC_API_URL = 'http://localhost:8000'
        NEXT_PUBLIC_MIDTRANS_CLIENT_KEY = 'SB-Mid-client-local-placeholder'
    }

    stages {
        stage('Prepare Workspace') {
            steps {
                sh '''
                    set -eu
                    test -f Jenkinsfile
                    mkdir -p reports backend/reports frontend/reports
                    rm -rf backend/.jenkins-venv
                    docker version
                    docker compose version
                    node --version
                    npm --version
                    python3 --version
                    k6 version
                    trivy --version
                '''
            }
        }

        stage('Start CI Services') {
            steps {
                sh '''
                    set -eu
                    ${COMPOSE} up -d db redis
                    echo "Menunggu PostgreSQL dan Redis sehat..."
                    for i in $(seq 1 30); do
                        DB_STATUS=$(docker inspect -f '{{.State.Health.Status}}' concertix-db 2>/dev/null || true)
                        REDIS_STATUS=$(docker inspect -f '{{.State.Health.Status}}' concertix-redis 2>/dev/null || true)
                        if [ "$DB_STATUS" = "healthy" ] && [ "$REDIS_STATUS" = "healthy" ]; then
                            exit 0
                        fi
                        sleep 2
                    done
                    docker compose ps
                    exit 1
                '''
            }
        }

        stage('Build & Unit Test') {
            parallel {
                stage('Backend') {
                    steps {
                        sh '''
                            set +e
                            mkdir -p backend/reports
                            tar \
                              --exclude='.venv' \
                              --exclude='.jenkins-venv' \
                              --exclude='__pycache__' \
                              --exclude='.pytest_cache' \
                              -C backend -cf - . | docker build -t concertix-backend:jenkins -
                            BUILD_STATUS=$?
                            if [ "$BUILD_STATUS" -ne 0 ]; then
                                exit "$BUILD_STATUS"
                            fi

                            BACKEND_IMAGE=concertix-backend:jenkins
                            docker rm -f concertix-backend-test >/dev/null 2>&1 || true
                            docker create --name concertix-backend-test \
                              --network concertix_concertix-net \
                              -w /app \
                              -e DATABASE_URL="${DATABASE_URL}" \
                              -e REDIS_URL="${REDIS_URL}" \
                              -e RATE_LIMIT_STORAGE_URL="${RATE_LIMIT_STORAGE_URL}" \
                              -e DEBUG="${DEBUG}" \
                              -e EXPOSE_API_DOCS="${EXPOSE_API_DOCS}" \
                              -e EXPOSE_METRICS="${EXPOSE_METRICS}" \
                              -e TOKEN_BLACKLIST_FAIL_CLOSED="${TOKEN_BLACKLIST_FAIL_CLOSED}" \
                              -e TRUST_PROXY_HEADERS="${TRUST_PROXY_HEADERS}" \
                              -e JWT_SECRET_KEY="${JWT_SECRET_KEY}" \
                              -e CORS_ALLOWED_ORIGIN="${CORS_ALLOWED_ORIGIN}" \
                              -e MIDTRANS_SERVER_KEY="${MIDTRANS_SERVER_KEY}" \
                              -e MIDTRANS_CLIENT_KEY="${MIDTRANS_CLIENT_KEY}" \
                              -e MIDTRANS_IS_PRODUCTION="${MIDTRANS_IS_PRODUCTION}" \
                              "$BACKEND_IMAGE" \
                              sh -lc "mkdir -p reports && python -m scripts.init_demo && alembic upgrade head && python -m compileall app scripts && pytest -q --junitxml=reports/pytest-results.xml --cov=app --cov-report=xml:reports/coverage.xml"
                            docker start -a concertix-backend-test
                            TEST_STATUS=$?
                            docker cp concertix-backend-test:/app/reports/. backend/reports/ >/dev/null 2>&1 || true
                            docker rm -f concertix-backend-test >/dev/null 2>&1 || true
                            exit "$TEST_STATUS"
                        '''
                    }
                    post {
                        always {
                            junit allowEmptyResults: true, testResults: 'backend/reports/pytest-results.xml'
                        }
                    }
                }

                stage('Frontend') {
                    steps {
                        dir('frontend') {
                            sh '''
                                set -eu
                                npm ci
                                npm run lint
                                npx tsc --noEmit
                                npm run build
                            '''
                        }
                    }
                }
            }
        }

        stage('SAST - SonarQube') {
            steps {
                sh '''
                    set -eu
                    mkdir -p reports/sonar
                    if curl -fsS "${SONAR_HOST_URL}/api/system/status" > reports/sonar/status.json; then
                        if ! command -v sonar-scanner >/dev/null 2>&1; then
                            echo "sonar-scanner CLI belum tersedia di image Jenkins." | tee reports/sonar/sonar-scanner-missing.txt
                        elif [ -n "${SONAR_TOKEN:-}" ]; then
                            sonar-scanner \
                              -Dsonar.host.url="${SONAR_HOST_URL}" \
                              -Dsonar.token="${SONAR_TOKEN}" \
                              -Dsonar.projectKey=concertix \
                              -Dsonar.projectName=Concertix \
                              -Dsonar.sources=backend/app,frontend/src \
                              -Dsonar.python.version=3.11 \
                              -Dsonar.python.coverage.reportPaths=backend/reports/coverage.xml \
                              -Dsonar.exclusions=**/node_modules/**,**/.next/**,**/venv/**,**/.jenkins-venv/**,**/__pycache__/**
                        else
                            echo "SonarQube aktif, tapi SONAR_TOKEN belum diset di Jenkins credentials/environment." | tee reports/sonar/sonarqube-token-missing.txt
                        fi
                    else
                        echo "SonarQube belum aktif. Start dengan: docker compose --profile security up -d sonarqube" | tee reports/sonar/sonarqube-skipped.txt
                    fi
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: 'reports/sonar/**', allowEmptyArchive: true
                }
            }
        }

        stage('Dependency & Secret Scan') {
            parallel {
                stage('npm audit') {
                    steps {
                        dir('frontend') {
                            sh '''
                                set +e
                                mkdir -p ../reports/npm-audit
                                npm audit --audit-level=high --json > ../reports/npm-audit/npm-audit.json
                                STATUS=$?
                                if [ "$STATUS" -ne 0 ]; then
                                    echo "npm audit menemukan dependency high/critical."
                                    [ "${STRICT_SECURITY_GATES}" = "true" ] && exit "$STATUS"
                                fi
                                exit 0
                            '''
                        }
                    }
                }

                stage('pip-audit') {
                    steps {
                        sh '''
                            set +e
                            mkdir -p reports/pip-audit
                            BACKEND_IMAGE=concertix-backend:jenkins
                            docker rm -f concertix-pip-audit >/dev/null 2>&1 || true
                            docker create --name concertix-pip-audit -w /app "$BACKEND_IMAGE" \
                              sh -lc "pip install --quiet pip-audit && pip-audit -r requirements.txt -f json > /tmp/pip-audit.json"
                            docker start -a concertix-pip-audit
                            STATUS=$?
                            docker cp concertix-pip-audit:/tmp/pip-audit.json reports/pip-audit/pip-audit.json >/dev/null 2>&1 || true
                            docker rm -f concertix-pip-audit >/dev/null 2>&1 || true
                            if [ "$STATUS" -ne 0 ]; then
                                echo "pip-audit menemukan dependency vulnerability."
                                [ "${STRICT_SECURITY_GATES}" = "true" ] && exit "$STATUS"
                            fi
                            exit 0
                        '''
                    }
                }

                stage('Basic Secret Scan') {
                    steps {
                        sh '''
                            set +e
                            mkdir -p reports/secret-scan
                            git grep -InE "(AKIA[0-9A-Z]{16}|BEGIN (RSA |OPENSSH |EC |DSA )?PRIVATE KEY|MIDTRANS_SERVER_KEY=.*[A-Za-z0-9_-]{20,}|JWT_SECRET_KEY=.*[A-Za-z0-9_-]{32,})" -- . \
                              ':!*.md' ':!.env.example' ':!reports/**' ':!frontend/package-lock.json' \
                              > reports/secret-scan/findings.txt
                            STATUS=$?
                            if [ "$STATUS" -eq 0 ]; then
                                echo "Secret scan menemukan pola secret. Lihat reports/secret-scan/findings.txt"
                                [ "${STRICT_SECURITY_GATES}" = "true" ] && exit 1
                            fi
                            exit 0
                        '''
                    }
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'reports/npm-audit/**,reports/pip-audit/**,reports/secret-scan/**', allowEmptyArchive: true
                }
            }
        }

        stage('Docker Build') {
            steps {
                sh '''
                    set -eu
                    tar \
                      --exclude='.venv' \
                      --exclude='.jenkins-venv' \
                      --exclude='__pycache__' \
                      --exclude='.pytest_cache' \
                      -C backend -cf - . | docker build -t concertix-backend:jenkins -
                    tar \
                      --exclude='node_modules' \
                      --exclude='.next' \
                      -C frontend -cf - . | docker build \
                        --build-arg NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL}" \
                        --build-arg NEXT_PUBLIC_MIDTRANS_CLIENT_KEY="${NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}" \
                        -t concertix-frontend:jenkins -
                '''
            }
        }

        stage('Local Deploy') {
            steps {
                sh '''
                    set -eu
                    ${COMPOSE} ${RUNTIME_COMPOSE_FILES} up -d --no-build db redis backend frontend
                    echo "Menunggu backend dan frontend siap..."
                    for i in $(seq 1 30); do
                        if curl -fsS "${BACKEND_URL}/" >/dev/null && curl -fsS "${FRONTEND_URL}" >/dev/null; then
                            exit 0
                        fi
                        sleep 2
                    done
                    docker compose ps
                    exit 1
                '''
            }
        }

        stage('Network & Security Smoke Test') {
            steps {
                sh '''
                    set -eu
                    mkdir -p reports
                    curl -fsS "${BACKEND_URL}/" | tee reports/backend-health.txt
                    curl -fsSI "${FRONTEND_URL}" | tee reports/frontend-headers.txt
                    curl -o /dev/null -s -w "Backend: %{time_total}s | HTTP %{http_code}\\n" "${BACKEND_URL}/" | tee reports/network-report.txt
                    curl -o /dev/null -s -w "Frontend: %{time_total}s | HTTP %{http_code}\\n" "${FRONTEND_URL}" | tee -a reports/network-report.txt
                    echo "Network isolation check: PostgreSQL tidak punya host port di docker-compose.yml." | tee -a reports/network-report.txt
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: 'reports/backend-health.txt,reports/frontend-headers.txt,reports/network-report.txt', allowEmptyArchive: true
                }
            }
        }

        stage('Performance Test - k6') {
            steps {
                sh '''
                    set -eu
                    mkdir -p reports
                    k6 run --env TARGET_URL="${BACKEND_URL}" --out json=reports/k6-results.json performance/load-test.js
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: 'reports/k6-summary.json,reports/k6-results.json', allowEmptyArchive: true
                }
            }
        }

        stage('Container Image Scan - Trivy') {
            steps {
                sh '''
                    set +e
                    mkdir -p reports/trivy
                    BACKEND_IMAGE=concertix-backend:jenkins
                    FRONTEND_IMAGE=concertix-frontend:jenkins

                    trivy image --severity HIGH,CRITICAL --format table --output reports/trivy/backend.txt "$BACKEND_IMAGE"
                    BACKEND_STATUS=$?
                    trivy image --severity HIGH,CRITICAL --format table --output reports/trivy/frontend.txt "$FRONTEND_IMAGE"
                    FRONTEND_STATUS=$?

                    cat reports/trivy/backend.txt reports/trivy/frontend.txt > reports/trivy/summary.txt
                    if [ "$BACKEND_STATUS" -ne 0 ] || [ "$FRONTEND_STATUS" -ne 0 ]; then
                        echo "Trivy menemukan HIGH/CRITICAL vulnerability."
                        [ "${STRICT_SECURITY_GATES}" = "true" ] && exit 1
                    fi
                    exit 0
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: 'reports/trivy/**', allowEmptyArchive: true
                }
            }
        }

        stage('DAST - OWASP ZAP') {
            steps {
                sh '''
                    set +e
                    mkdir -p reports/zap
                    docker rm -f concertix-zap-scan >/dev/null 2>&1 || true
                    docker volume rm concertix_zap_work >/dev/null 2>&1 || true
                    docker volume create concertix_zap_work >/dev/null
                    docker run --rm --user root \
                      -v concertix_zap_work:/zap/wrk:rw \
                      ghcr.io/zaproxy/zaproxy:stable \
                      sh -lc 'chmod 0777 /zap/wrk'
                    docker run --name concertix-zap-scan \
                      --network concertix_concertix-net \
                      -v concertix_zap_work:/zap/wrk:rw \
                      ghcr.io/zaproxy/zaproxy:stable \
                      zap-api-scan.py \
                      -t "${BACKEND_URL}/openapi.json" \
                      -f openapi \
                      -r zap_report.html \
                      -J zap_report.json \
                      -l WARN
                    STATUS=$?
                    docker cp concertix-zap-scan:/zap/wrk/zap_report.html reports/zap/zap_report.html >/dev/null 2>&1 || true
                    docker cp concertix-zap-scan:/zap/wrk/zap_report.json reports/zap/zap_report.json >/dev/null 2>&1 || true
                    docker rm -f concertix-zap-scan >/dev/null 2>&1 || true
                    if [ "$STATUS" -ne 0 ]; then
                        echo "ZAP menemukan warning/finding. Lihat report HTML."
                        [ "${STRICT_SECURITY_GATES}" = "true" ] && exit "$STATUS"
                    fi
                    exit 0
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: 'reports/zap/**', allowEmptyArchive: true
                    publishHTML(target: [
                        reportDir: 'reports/zap',
                        reportFiles: 'zap_report.html',
                        reportName: 'OWASP ZAP Report',
                        keepAll: true,
                        alwaysLinkToLastBuild: true,
                        allowMissing: true
                    ])
                }
            }
        }
    }

    post {
        always {
            sh '''
                set +e
                mkdir -p reports
                docker stats --no-stream --format "table {{.Name}}\\t{{.CPUPerc}}\\t{{.MemUsage}}\\t{{.MemPerc}}\\t{{.NetIO}}" > reports/docker-stats.txt
                docker compose ps > reports/docker-compose-ps.txt
            '''
            archiveArtifacts artifacts: 'reports/**', allowEmptyArchive: true
            echo 'Pipeline selesai. Report tersimpan di Jenkins Artifacts.'
        }
        success {
            echo 'Concertix local DevSecOps pipeline SUKSES.'
        }
        failure {
            echo 'Concertix local DevSecOps pipeline GAGAL. Buka stage merah dan artifacts untuk bukti temuan.'
        }
    }
}
