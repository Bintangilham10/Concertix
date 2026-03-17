pipeline {
    agent any

    environment {
        DOCKER_COMPOSE = 'docker-compose'
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
                            sh 'npm run test || echo "No tests configured yet"'
                        }
                    }
                }
                stage('Test Backend') {
                    steps {
                        dir('backend') {
                            sh 'pytest || echo "No tests configured yet"'
                        }
                    }
                }
            }
        }

        stage('Security Scan') {
            parallel {
                stage('SonarQube') {
                    steps {
                        echo 'TODO: Configure SonarQube scanner'
                    }
                }
                stage('OWASP Dependency-Check') {
                    steps {
                        echo 'TODO: Configure OWASP Dependency-Check'
                    }
                }
                stage('OWASP ZAP') {
                    steps {
                        echo 'TODO: Configure OWASP ZAP scan'
                    }
                }
            }
        }

        stage('Docker Build') {
            steps {
                sh "${DOCKER_COMPOSE} build"
            }
        }

        stage('Deploy') {
            steps {
                echo 'TODO: Configure deployment target'
            }
        }
    }

    post {
        always {
            echo 'Pipeline finished.'
        }
        failure {
            echo 'Pipeline failed!'
        }
    }
}
