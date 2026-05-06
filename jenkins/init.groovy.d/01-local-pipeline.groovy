import jenkins.model.Jenkins
import org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition
import org.jenkinsci.plugins.workflow.job.WorkflowJob

def jenkins = Jenkins.get()
def jobName = 'concertix-local-devsecops'
def pipelineFile = new File('/workspace/Jenkinsfile')

def pipelineScript = pipelineFile.exists()
    ? pipelineFile.text
    : '''
pipeline {
    agent any
    stages {
        stage('Missing Workspace') {
            steps {
                error 'Jenkinsfile tidak ditemukan di /workspace. Pastikan repo di-mount ke container Jenkins.'
            }
        }
    }
}
'''

def job = jenkins.getItem(jobName)
if (job == null) {
    job = jenkins.createProject(WorkflowJob, jobName)
}

job.setDefinition(new CpsFlowDefinition(pipelineScript, true))
job.save()

