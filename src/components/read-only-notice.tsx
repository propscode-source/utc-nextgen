import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleInfo } from "@fortawesome/free-solid-svg-icons";

export function ReadOnlyNotice({ adminName }: { adminName: string | null }) {
  return (
    <div className="rounded-md border border-sky-500/30 bg-sky-500/5 px-4 py-3 text-sm flex items-start gap-3">
      <FontAwesomeIcon icon={faCircleInfo} className="h-4 w-4 text-sky-500 mt-0.5 shrink-0" />
      <div className="text-sky-700 dark:text-sky-300">
        <strong>Mode lihat saja.</strong>{" "}
        {adminName ? (
          <>
            Hanya <strong>{adminName}</strong> (admin lab ini) dan superadmin yang dapat mengubah data.
          </>
        ) : (
          <>Hanya admin lab dan superadmin yang dapat mengubah data. Lab ini belum punya admin.</>
        )}
      </div>
    </div>
  );
}
