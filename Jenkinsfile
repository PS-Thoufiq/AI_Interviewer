def dockerImage  // Declare global variable

pipeline {
    agent any
    parameters {
        choice(name: 'ENV', choices: ['qa', 'preprod', 'prod'], description: 'Select environment')
    }
    stages {
        stage('Checkout') {
            steps {
                git 'https://github.com/PS-Thoufiq/AI_Interviewer.git'
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    dockerImage = docker.build("react-${params.ENV}")
                }
            }
        }

        stage('Deploy Container') {
            steps {
                script {
                    def port = params.ENV == 'qa' ? '3001' : params.ENV == 'preprod' ? '3002' : '3003'
                    sh "docker rm -f react-${params.ENV} || true"
                    sh "docker run -d --name react-${params.ENV} -p ${port}:3000 react-${params.ENV}"
                }
            }
        }
    }
}
