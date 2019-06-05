export let MENU_ITEM = [
    {
        userType: 0,
        menu: [
            {
                path: '/dashboard/index',
                title: 'Dashboard',
                icon: 'dashboard'
            },
            {
                path: '/dashboard/store-locator',
                title: 'Store Locator',
                icon: 'map-marker'
            },
            {
                path: '/dashboard/branch-location',
                title: 'Change Branch',
                icon: 'map-pin'
            },
            {
                path: '/dashboard/feedback',
                title: 'Feedback',
                icon: 'id-card-o'
            },
            {
                path: '/dashboard/profile',
            }
        ]
    },
    {
        userType: 1,
        menu: [
            {
                path: '/merchant/index',
                title: 'Dashboard',
                icon: 'dashboard'
            },
            {
                path: '/merchant/users-list',
                title: 'Manage Users',
                icon: 'user'
            },
            {
                path: '/merchant/profile',
            }
            /* {
                path: 'menu-levels',
                title: 'Menu Levels',
                icon: 'sitemap',
                children: [
                    {
                        path: 'levels1',
                        title: 'Menu Level1',
                        children: [
                            {
                                path: 'levels1-1',
                                title: 'Menu Level1-1'
                            }
                        ]
                    },
                    {
                        path: 'levels2',
                        title: 'Menu Level2'
                    }
                ]
            }, */
        ]
    },
    {
        userType: 2,
        menu: [
            {
                path: '/merchant/index',
                title: 'Dashboard',
                icon: 'dashboard'
            },
            {
                path: '/merchant/users-list',
                title: 'Manage Users',
                icon: 'user'
            },
            {
                path: '/merchant/profile',
            }
            /* {
                path: 'menu-levels',
                title: 'Menu Levels',
                icon: 'sitemap',
                children: [
                    {
                        path: 'levels1',
                        title: 'Menu Level1',
                        children: [
                            {
                                path: 'levels1-1',
                                title: 'Menu Level1-1'
                            }
                        ]
                    },
                    {
                        path: 'levels2',
                        title: 'Menu Level2'
                    }
                ]
            }, */
        ]
    },
    {
        userType: 3,
        menu: [
            {
                path: '/merchant/index',
                title: 'Dashboard',
                icon: 'dashboard'
            },
            {
                path: '/merchant/users-list',
                title: 'Manage Users',
                icon: 'user'
            },
            {
                path: '/merchant/profile',
            }
        ]
    },
    {
        userType: 4,//sub merchant admin
        menu: [
            {
                path: '/merchant/index',
                title: 'Dashboard',
                icon: 'dashboard'
            },
            {
                path: '/merchant/users-list',
                title: 'Manage Users',
                icon: 'user'
            },
            {
                path: '/merchant/loyalty-management',
                title: 'Loyalty Management',
                icon: 'sitemap',
                children: [
                    {
                        path: 'manage-customers',
                        title: 'Manage Customers',
                        icon: 'user-group'
                    },
                    {
                        path: 'get-mobile-number-change-log',
                        title: 'Mobile Number Change Log',
                        icon: 'user-group'
                    },
                    {
                        path: 'get-home-branch-change-requests',
                        title: 'Home Branch Change Log',
                        icon: 'user-group'
                    }
                ]
            },
            {
                path: '',
                title: 'Reports',
                icon: 'file-text',
                children: [
                    {
                        path: '/merchant/reports/transaction-reports',
                        title: 'Transaction Reports',
                        icon: 'map'
                    },
                    {
                        path: '/merchant/reports/voucher-reports',
                        title: 'Voucher redemption data',
                        icon: 'tags'
                    },
                    {
                        path: '/merchant/reports/registration-reports',
                        title: 'New Registration',
                        icon: 'address-card'
                    },
                    {
                        path: '/merchant/reports/campaign-roi',
                        title: 'Campaign ROI',
                        icon: 'address-card'
                    }
                ]
            },
            {
                path: '/merchant/profile',
            }
        ]
    },
    {
        userType: 5,//pos admin
        menu: [
            {
                path: '/merchant/index',
                title: 'Dashboard',
                icon: 'dashboard'
            },
            {
                path: '/merchant/loyalty-management',
                title: 'Loyalty Management',
                icon: 'sitemap',
                children: [
                    {
                        path: 'manage-customers',
                        title: 'Manage Customers',
                        icon: 'users'
                    }
                ]
            },
            {
                path: '',
                title: 'Reports',
                icon: 'file-text',
                children: [
                    {
                        path: '/merchant/reports/transaction-reports',
                        title: 'Transaction Reports',
                        icon: 'map'
                    },
                    {
                        path: '/merchant/reports/voucher-reports',
                        title: 'Voucher redemption data',
                        icon: 'tags'
                    },
                    {
                        path: '/merchant/reports/registration-reports',
                        title: 'New Registration',
                        icon: 'address-card'
                    }
                ]
            },
            {
                path: '/merchant/profile',
            }
        ]
    }
];
