import Swal from "sweetalert2";

export default async function ConfirmModal(title: string, text: string): Promise<boolean> {
  const result = await Swal.fire({
    title,
    text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Yes",
    cancelButtonText: "No",
  });
  return result.isConfirmed;
}
