import { ref, reactive } from 'vue';
import { useToast } from 'vue-toastification';
import { lintWorkflow, submitJob } from '@automa/types/api';

export function useStudioRunner(automaCoreState) {
  const toast = useToast();
  const lintIssues = ref([]);
  const isLinting = ref(false);
  let lintDebounceTimer = null;

  const runModalState = reactive({
    show: false,
    isSubmitting: false,
    browserId: 'daemon_worker',
    headless: false,
    closeBrowserOnFinish: false,
  });

  async function executeLint(workflow) {
    if (!automaCoreState || automaCoreState.status !== 'online') {
      lintIssues.value = [];
      return;
    }
    isLinting.value = true;
    try {
      const res = await lintWorkflow({
        baseUrl: automaCoreState.baseUrl,
        body: {
          nodes: workflow?.drawflow?.nodes || workflow?.nodes || [],
          edges: workflow?.drawflow?.edges || workflow?.edges || [],
          drawflow: workflow?.drawflow || null,
        },
      });
      if (res.data && res.data.issues) {
        lintIssues.value = res.data.issues;
      } else {
        lintIssues.value = [];
      }
    } catch (_) {
      lintIssues.value = [];
    } finally {
      isLinting.value = false;
    }
  }

  function runLiveLint(workflow) {
    if (lintDebounceTimer) clearTimeout(lintDebounceTimer);
    lintDebounceTimer = setTimeout(() => {
      executeLint(workflow);
    }, 800);
  }

  function triggerManualLint(workflow) {
    executeLint(workflow).then(() => {
      if (lintIssues.value.length === 0) {
        toast.success('Workflow validation passed! No issues found.');
      } else {
        toast.warning(
          `Lint detected ${lintIssues.value.length} potential issue(s).`
        );
      }
    });
  }

  function openRunModal() {
    if (!automaCoreState || automaCoreState.status !== 'online') {
      toast.error('Automa Core daemon is offline. Cannot execute workflow.');
      return;
    }
    runModalState.show = true;
  }

  async function submitWorkflowExecution(workflow, currentFilePath, onFinish) {
    if (!automaCoreState || automaCoreState.status !== 'online') {
      toast.error('Automa Core is offline.');
      return;
    }

    runModalState.isSubmitting = true;
    try {
      const payload = {
        workflowData: workflow,
        options: {
          browserId: runModalState.browserId,
          headless: runModalState.headless,
          closeBrowserOnFinish: runModalState.closeBrowserOnFinish,
        },
      };
      if (currentFilePath) {
        payload.workflowPath = currentFilePath;
      }

      const res = await submitJob({
        baseUrl: automaCoreState.baseUrl,
        body: payload,
      });

      if (res.data && res.data.jobId) {
        toast.success(
          `Workflow submitted! Job ID: ${res.data.jobId.slice(0, 8)}`
        );
        runModalState.show = false;
        if (typeof onFinish === 'function') {
          onFinish(res.data.jobId);
        }
      } else if (res.error) {
        toast.error(`Execution failed: ${res.error.message || 'Error'}`);
      }
    } catch (e) {
      toast.error(`Failed to submit job: ${e.message}`);
    } finally {
      runModalState.isSubmitting = false;
    }
  }

  return {
    lintIssues,
    isLinting,
    runModalState,
    runLiveLint,
    triggerManualLint,
    openRunModal,
    submitWorkflowExecution,
  };
}
