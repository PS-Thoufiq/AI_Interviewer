pipeline {
    agent any
    parameters {
        choice(name: 'ENV', choices: ['qa', 'preprod', 'prod'], description: 'Select environment')
    }
    
    environment {
        IMAGE_NAME = "react-app-${params.ENV}"
        CONTAINER_NAME = "react-${params.ENV}"
        PORT = "${params.ENV == 'qa' ? '3001' : params.ENV == 'preprod' ? '3002' : '3003'}"
    }
    
    stages {
        stage('Clean Workspace') {
            steps {
                cleanWs()
                sh 'docker system prune -af || true'
            }
        }
        
        stage('Checkout Code') {
            steps {
                git branch: 'main', url: 'https://github.com/PS-Thoufiq/AI_Interviewer.git'
            }
        }
        
        stage('Build Docker Image') {
            steps {
                script {
                    sh """
                        docker build \
                            --no-cache \
                            --progress=plain \
                            -t ${IMAGE_NAME} . \
                            2>&1 | tee docker-build.log
                    """
                    archiveArtifacts 'docker-build.log'
                }
            }
        }
        
        stage('Verify Build') {
            steps {
                script {
                    sh """
                        docker run --rm ${IMAGE_NAME} \
                            ls -la /app/dist > dist-contents.log
                    """
                    archiveArtifacts 'dist-contents.log'
                }
            }
        }
        
        stage('Deploy Container') {
            steps {
                script {
                    sh "docker stop ${CONTAINER_NAME} || true"
                    sh "docker rm ${CONTAINER_NAME} || true"
                    sh """
                        docker run -d \
                            --name ${CONTAINER_NAME} \
                            -p ${PORT}:3000 \
                            ${IMAGE_NAME}
                    """
                }
            }
        }
        
        stage('Verify Deployment') {
            steps {
                script {
                    sleep 10
                    sh """
                        curl -fv http://localhost:${PORT} > curl-output.log 2>&1 || true
                    """
                    archiveArtifacts 'curl-output.log'
                }
            }
        }
    }
}