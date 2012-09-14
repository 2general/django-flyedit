from setuptools import setup, find_packages

setup(
    name='django-flyedit',
    version='0.3.3',
    description='Tools for Django in-line editing',
    author='Antti Kaihola',
    author_email='antti@2general.com',
    packages=find_packages(),
    package_data={
        '': ['static/flyedit/js/*.js',
             'static/flyedit/css/*.css'],
    },
    classifiers=[
        'Development Status :: 3 - Alpha',
        'Framework :: Django',
        'Intended Audience :: Developers',
        'Operating System :: OS Independent',
        'Programming Language :: Python',
        'Topic :: Internet :: WWW/HTTP',
    ]
)
