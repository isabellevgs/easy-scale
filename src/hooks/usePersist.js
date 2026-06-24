import { useToast } from "./useToast";

export function usePersist() {
  const toast = useToast();

  function notifySave(result, successMessage, errorMessage) {
    if (result?.ok) {
      toast.success(successMessage);
      return;
    }
    toast.error(result?.error || errorMessage);
  }

  async function persist(action, successMessage, errorMessage) {
    const result = await action();
    notifySave(result, successMessage, errorMessage);
    return result;
  }

  return { notifySave, persist };
}
