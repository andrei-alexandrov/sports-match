import React from 'react';
import { Alert } from 'react-bootstrap';

function CustomAlert({ variant, message }) {
    switch (variant) {
        case 'success':
            return <Alert variant="success">{message}</Alert>;
        case 'danger':
            return <Alert variant="danger">{message}</Alert>;
        case 'warning':
            return <Alert variant="warning">{message}</Alert>;
        case 'info':
            return <Alert variant="info">{message}</Alert>;
        default:
            return <Alert>{message}</Alert>;
    }
}

export default CustomAlert;
