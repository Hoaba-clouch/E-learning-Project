type AdminDataStateProps = {
  error: string;
  isLoading: boolean;
};

function AdminDataState({ error, isLoading }: AdminDataStateProps) {
  if (isLoading) {
    return <div className="route-loading">Đang tải dữ liệu quản trị...</div>;
  }

  if (error) {
    return (
      <div className="route-loading" role="alert">
        {error}
      </div>
    );
  }

  return null;
}

export default AdminDataState;
