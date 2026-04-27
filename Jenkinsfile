pipeline {
    agent any

    environment {
        DOCKER_COMPOSE = 'docker-compose'
        SONAR_HOST_URL = 'http://sonarqube:9000'
        ZAP_TARGET = 'http://localhost:8000'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build') {
            parallel {
                stage('Build Frontend') {
                    steps {
                        dir('frontend') {
                            sh 'npm ci'
                            sh 'npm run build'
                        }
                    }
                }
                stage('Build Backend') {
                    steps {
                        dir('backend') {
                            sh 'pip install -r requirements.txt'
                        }
                    }
                }
            }
        }

        stage('Test') {
            parallel {
                stage('Test Frontend') {
                    steps {
                        dir('frontend') {
                            sh 'npm run lint'
                        }
                    }
                }
                stage('Test Backend') {
                    steps {
                        dir('backend') {
                            sh 'mkdir -p reports'
                            sh 'pytest --junitxml=reports/pytest-results.xml --cov=app --cov-report=xml:reports/coverage.xml'
                        }
                    }
                    post {
                        always {
                            junit allowEmptyResults: true, testResults: 'backend/reports/pytest-results.xml'
                        }
                    }
                }
            }
        }

        stage('Static Security Scan') {
            parallel {
                stage('SonarQube SAST') {
                    steps {
                        script {
                            def scannerHome = tool 'SonarQubeScanner'
                            withSonarQubeEnv('SonarQube') {
                                sh """
                                    ${scannerHome}/bin/sonar-scanner \
                                        -Dsonar.projectKey=concertix \
                                        -Dsonar.sources=backend/app,frontend/src \
                                        -Dsonar.python.version=3.11 \
                                        -Dsonar.python.coverage.reportPaths=backend/reports/coverage.xml \
                                        -Dsonar.javascript.lcov.reportPaths=frontend/coverage/lcov.info \
                                        -Dsonar.exclusions=**/node_modules/**,**/.next/**,**/venv/**
                                """
                            }
                        }
                    }
                }

                stage('OWASP Dependency-Check') {
                    steps {
                        dependencyCheck additionalArguments: '''
                            --scan backend/requirements.txt
                            --scan frontend/package-lock.json
                            --format HTML
                            --format JSON
                            --out reports/dependency-check
                        ''', odcInstallation: 'OWASP-Dependency-Check'
                    }
                    post {
                        always {
                            dependencyCheckPublisher pattern: 'reports/dependency-check/dependency-check-report.json',
                                failedTotalCritical: 1,
                                failedTotalHigh: 5
                        }
                    }
                }

            }
        }

        stage('SonarQube Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Docker Build') {
            steps {
                sh "${DOCKER_COMPOSE} build --no-cache"
            }
        }

        stage('Deploy') {
            steps {
                sh "${DOCKER_COMPOSE} down || true"
                sh "${DOCKER_COMPOSE} up -d"
                // Wait for services to be healthy
                sh "sleep 15"
                sh "curl -f http://localhost:8000/ || exit 1"
                echo 'Deployment successful!'
            }
        }

        stage('OWASP ZAP DAST') {
            steps {
                sh 'mkdir -p reports'
                sh """
                    docker run --rm --network=host \
                        -v \$(pwd)/reports:/zap/wrk/:rw \
                        ghcr.io/zaproxy/zaproxy:stable \
                        zap-api-scan.py \
                        -t ${ZAP_TARGET}/openapi.json \
                        -f openapi \
                        -r zap_report.html \
                        -J zap_report.json \
                        -l WARN
                """
            }
            post {
                always {
                    publishHTML(target: [
                        reportDir: 'reports',
                        reportFiles: 'zap_report.html',
                        reportName: 'OWASP ZAP Report',
                        keepAll: true
                    ])
                }
            }
        }
    }

    post {
        always {
            echo 'Pipeline finished.'
            // Archive all reports
            archiveArtifacts artifacts: 'reports/**', allowEmptyArchive: true
        }
        success {
            echo 'Pipeline succeeded!'
        }
        failure {
            echo 'Pipeline failed! Check reports for details.'
            // TODO: Configure Slack/Email notification
            // slackSend channel: '#concertix-ci', message: "❌ Build FAILED: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
        }
    }
}
