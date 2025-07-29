import React from 'react';

interface Props {
    upload_result?: any;
    link_data?: any;
}

const EmptyResponse: React.FC<Props> = ({ upload_result, link_data }) => {
    // This component doesn't render anything visible
    // It's just used to receive data from InertiaJS responses
    return null;
};

export default EmptyResponse;
