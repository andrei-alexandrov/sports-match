interface ComingSoonProps {
  feature: string;
}

export default function ComingSoon({ feature }: ComingSoonProps) {
  return (
    <div style={{ color: "white", textAlign: "center", marginTop: "4rem" }}>
      <h2>{feature} is coming soon</h2>
      <p>This part of Sports Match is being rebuilt on the new platform.</p>
    </div>
  );
}
