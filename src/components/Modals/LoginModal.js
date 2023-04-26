import Swal from 'sweetalert2';

const LoginModal = () => {
  return new Promise((resolve, reject) => {
    try {
      Swal.fire({
        icon: "warning",
        title: "You have to log in first!",
        confirmButtonText: "Log in",
        showCancelButton: true,
        cancelButtonText: "Cancel",
      }).then((result) => {
        if (result.isConfirmed) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    } catch (error) {
      console.error('Error in LoginModal:', error);
      reject(error);
    }
  });
};

export default LoginModal;
