import { useEffect, useState } from "react";
import { getAdminData } from "../services/adminApi";

type AdminDataState<T> = {
  data: T | null;
  error: string;
  isLoading: boolean;
};

export function useAdminData<T>(path: string): AdminDataState<T> {
  const [state, setState] = useState<AdminDataState<T>>({
    data: null,
    error: "",
    isLoading: true,
  });

  useEffect(() => {
    const controller = new AbortController();

    getAdminData<T>(path, controller.signal)
      .then((data) => {
        setState({ data, error: "", isLoading: false });
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        setState({
          data: null,
          error:
            error instanceof Error
              ? error.message
              : "Không thể tải dữ liệu quản trị.",
          isLoading: false,
        });
      });

    return () => controller.abort();
  }, [path]);

  return state;
}
