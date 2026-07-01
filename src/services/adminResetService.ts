import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase/firebase';

interface AdminResetResult {
  success: boolean;
  message: string;
}

export function resetAdminData(confirmation: string, backupConfirmed: boolean): Promise<AdminResetResult> {
  const functions = getFunctions(app);
  const resetData = httpsCallable<
    { confirmation: string; backupConfirmed: boolean },
    AdminResetResult
  >(functions, 'adminResetData');

  return resetData({ confirmation, backupConfirmed }).then((result) => result.data);
}
