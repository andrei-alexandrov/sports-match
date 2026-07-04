export function formatDate(date: string | Date): string {
  const currentDate = new Date();
  const messageDate = new Date(date);

  let dateString = "";
  if (
    currentDate.getDate() !== messageDate.getDate() ||
    currentDate.getMonth() !== messageDate.getMonth() ||
    currentDate.getFullYear() !== messageDate.getFullYear()
  ) {
    dateString =
      messageDate.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric" }) + ", ";
  }

  const timeString = messageDate.toLocaleString("bg-BG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return dateString + timeString;
}
