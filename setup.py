from setuptools import setup, find_packages

setup(
    name='django-flyedit',
    version='0.1.2',
    description='Tools for Django in-line editing',
    author='Antti Kaihola',
    author_email='antti@2general.com',
    packages=find_packages(),
    package_data={
        '': ['static/flyedit/js/*.js'],
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
