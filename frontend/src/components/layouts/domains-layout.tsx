import { Outlet } from 'react-router-dom';

import { DomainsProvider } from '@/providers/domains-provider';

const DomainsLayout = () => {
    return (
        <DomainsProvider>
            <Outlet />
        </DomainsProvider>
    );
};

export default DomainsLayout;
