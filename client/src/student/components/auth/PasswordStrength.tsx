type PasswordStrengthProps = {
  score: number;
};

const strengthLabels = [
  "Chưa nhập mật khẩu",
  "Rất yếu",
  "Cần mạnh hơn",
  "Khá tốt",
  "Mạnh",
];

function PasswordStrength({ score }: PasswordStrengthProps) {
  return (
    <div className="password-strength" aria-live="polite">
      <div className="password-strength-bars" aria-hidden="true">
        {[0, 1, 2, 3].map((index) => (
          <span
            className={index < score ? "active" : ""}
            key={index}
          />
        ))}
      </div>
      <p>
        {strengthLabels[score]}: ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số
        và ký tự đặc biệt.
      </p>
    </div>
  );
}

export default PasswordStrength;
