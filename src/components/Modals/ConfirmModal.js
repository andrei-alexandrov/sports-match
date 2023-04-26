import Swal from "sweetalert2"; 
const ConfirmModal = async (title, text) => {
    try {
        const result = await Swal.fire({
            title: title,
            text: text,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes',
            cancelButtonText: 'No',
        });

        if (result.isConfirmed) {
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error('Error in ConfirmModal:', error);
        return false;
    }
};

export default ConfirmModal;